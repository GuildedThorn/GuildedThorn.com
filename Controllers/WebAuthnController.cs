#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Fido2NetLib;
using Fido2NetLib.Objects;
using GuildedThorn.com.Models;
using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace GuildedThorn.com.Controllers;

// WebAuthn / FIDO2 (YubiKey) ceremonies. Credentials are registered as
// discoverable (resident) keys, so the same key works for BOTH passwordless
// login (assert with no username) and as a second factor (assert with username
// after a password check).
//
// NOTE: this targets Fido2NetLib v4 (the *Params object API). It is written
// from the library docs but has not been compiled here — verify the few spots
// marked "VERIFY:" against your installed Fido2 version, then test on HTTPS with
// a real key.
[ApiController]
[Route("/api/[controller]")]
public class WebAuthnController(
    IFido2 fido2,
    MongoDbService mongo,
    WebAuthnChallengeStore challenges,
    JwtTokenService tokens) : ControllerBase {

    private IMongoCollection<WebAuthnCredential> Creds =>
        mongo.GetWebAuthnCredentialCollection();

    private string? CurrentUsername =>
        User.FindFirst("name")?.Value ?? User.Identity?.Name;

    // ───────────────────────── Registration ─────────────────────────

    public class RegisterFinishRequest {
        public string Id { get; set; } = string.Empty;
        public string? Nickname { get; set; }
        public AuthenticatorAttestationRawResponse Response { get; set; } = null!;
    }

    [Authorize]
    [HttpPost("register/begin")]
    public async Task<IActionResult> RegisterBegin() {
        var username = CurrentUsername;
        if (string.IsNullOrEmpty(username)) return Unauthorized();

        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == username).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        var existing = await Creds.Find(c => c.UserId == user.Id).ToListAsync();
        var excludeCredentials = existing
            .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
            .ToList();

        var fidoUser = new Fido2User {
            Id = Encoding.UTF8.GetBytes(user.Id),
            Name = user.Username,
            DisplayName = string.IsNullOrWhiteSpace(user.FirstName)
                ? user.Username
                : $"{user.FirstName} {user.LastName}".Trim(),
        };

        var options = fido2.RequestNewCredential(new RequestNewCredentialParams {
            User = fidoUser,
            ExcludeCredentials = excludeCredentials,
            AuthenticatorSelection = new AuthenticatorSelection {
                ResidentKey = ResidentKeyRequirement.Required, // discoverable → passwordless
                UserVerification = UserVerificationRequirement.Preferred,
            },
            AttestationPreference = AttestationConveyancePreference.None,
        });

        var optionsJson = options.ToJson();
        var id = challenges.Put(optionsJson, username);
        return Ok(new { id, optionsJson });
    }

    [Authorize]
    [HttpPost("register/finish")]
    public async Task<IActionResult> RegisterFinish([FromBody] RegisterFinishRequest body) {
        var entry = challenges.Take(body.Id);
        if (entry is null) return BadRequest("Registration challenge expired — try again.");

        var username = CurrentUsername;
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == username).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        var options = CredentialCreateOptions.FromJson(entry.Value.OptionsJson);

        IsCredentialIdUniqueToUserAsyncDelegate isUnique = async (args, _) => {
            var exists = await Creds.Find(c => c.CredentialId == args.CredentialId).AnyAsync();
            return !exists;
        };

        var result = await fido2.MakeNewCredentialAsync(new MakeNewCredentialParams {
            AttestationResponse = body.Response,
            OriginalOptions = options,
            IsCredentialIdUniqueToUserCallback = isUnique,
        });

        // Fido2 v4: MakeNewCredentialAsync returns RegisteredPublicKeyCredential
        // directly. The user handle is the Fido2User.Id we supplied at "begin"
        // (the user's id), which is what discoverable-credential login returns.
        var cred = new WebAuthnCredential {
            UserId = user.Id,
            Username = user.Username,
            CredentialId = result.Id,
            PublicKey = result.PublicKey,
            UserHandle = Encoding.UTF8.GetBytes(user.Id),
            SignCount = result.SignCount,
            CredType = "public-key",
            Nickname = string.IsNullOrWhiteSpace(body.Nickname)
                ? "Security key"
                : body.Nickname.Trim(),
        };
        await Creds.InsertOneAsync(cred);

        return Ok(new { ok = true });
    }

    // ───────────────────────── Assertion (login) ─────────────────────────

    public class AssertBeginRequest {
        public string? Username { get; set; } // omit/empty → passwordless (discoverable)
    }

    public class AssertFinishRequest {
        public string Id { get; set; } = string.Empty;
        public AuthenticatorAssertionRawResponse Response { get; set; } = null!;
    }

    [AllowAnonymous]
    [HttpPost("assert/begin")]
    public async Task<IActionResult> AssertBegin([FromBody] AssertBeginRequest? body) {
        var allowed = new List<PublicKeyCredentialDescriptor>();
        var username = body?.Username?.Trim();

        if (!string.IsNullOrEmpty(username)) {
            var user = await mongo.GetUserCollection()
                .Find(u => u.Username == username).FirstOrDefaultAsync();
            if (user != null) {
                var creds = await Creds.Find(c => c.UserId == user.Id).ToListAsync();
                allowed = creds
                    .Select(c => new PublicKeyCredentialDescriptor(c.CredentialId))
                    .ToList();
            }
        }

        var options = fido2.GetAssertionOptions(new GetAssertionOptionsParams {
            AllowedCredentials = allowed, // empty → any discoverable credential
            UserVerification = UserVerificationRequirement.Preferred,
        });

        var optionsJson = options.ToJson();
        var id = challenges.Put(optionsJson, username);
        return Ok(new { id, optionsJson });
    }

    [AllowAnonymous]
    [HttpPost("assert/finish")]
    public async Task<IActionResult> AssertFinish([FromBody] AssertFinishRequest body) {
        var entry = challenges.Take(body.Id);
        if (entry is null) return BadRequest("Login challenge expired — try again.");

        var options = AssertionOptions.FromJson(entry.Value.OptionsJson);

        // .Id is the base64url string; .RawId is the credential id bytes we stored.
        var stored = await Creds
            .Find(c => c.CredentialId == body.Response.RawId).FirstOrDefaultAsync();
        if (stored == null) return Unauthorized("Unknown security key.");

        IsUserHandleOwnerOfCredentialIdAsync isOwner = async (args, _) => {
            var c = await Creds.Find(x => x.CredentialId == args.CredentialId).FirstOrDefaultAsync();
            return c != null && c.UserHandle.SequenceEqual(args.UserHandle);
        };

        var result = await fido2.MakeAssertionAsync(new MakeAssertionParams {
            AssertionResponse = body.Response,
            OriginalOptions = options,
            StoredPublicKey = stored.PublicKey,
            StoredSignatureCounter = stored.SignCount,
            IsUserHandleOwnerOfCredentialIdCallback = isOwner,
        });

        // VERIFY: counter property may be `SignCount` or `Counter` in your version.
        stored.SignCount = result.SignCount;
        stored.LastUsedAt = DateTime.UtcNow;
        await Creds.ReplaceOneAsync(c => c.Id == stored.Id, stored);

        var user = await mongo.GetUserCollection()
            .Find(u => u.Id == stored.UserId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        tokens.IssueCookie(Response, user);
        return Ok(new { ok = true });
    }

    // ───────────────────────── Key management ─────────────────────────

    [Authorize]
    [HttpGet("credentials")]
    public async Task<IActionResult> ListCredentials() {
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == CurrentUsername).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        var creds = await Creds.Find(c => c.UserId == user.Id)
            .SortByDescending(c => c.CreatedAt).ToListAsync();

        return Ok(creds.Select(c => new {
            id = c.Id,
            nickname = c.Nickname,
            createdAt = c.CreatedAt,
            lastUsedAt = c.LastUsedAt,
        }));
    }

    [Authorize]
    [HttpDelete("credentials/{id}")]
    public async Task<IActionResult> DeleteCredential(string id) {
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == CurrentUsername).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        var result = await Creds.DeleteOneAsync(c => c.Id == id && c.UserId == user.Id);
        if (result.DeletedCount == 0) return NotFound();

        // Never leave a user locked out: if that was their last key, turn 2FA off.
        if (user.TwoFactorEnabled) {
            var hasKeys = await Creds.Find(c => c.UserId == user.Id).AnyAsync();
            if (!hasKeys) {
                await mongo.GetUserCollection().UpdateOneAsync(
                    u => u.Id == user.Id,
                    Builders<User>.Update.Set(u => u.TwoFactorEnabled, false));
            }
        }

        return Ok(new { ok = true });
    }

    // ───────────────────────── Two-factor toggle ─────────────────────────

    public class TwoFactorRequest {
        public bool Enabled { get; set; }
    }

    [Authorize]
    [HttpGet("two-factor")]
    public async Task<IActionResult> GetTwoFactor() {
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == CurrentUsername).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        var hasKeys = await Creds.Find(c => c.UserId == user.Id).AnyAsync();
        return Ok(new { enabled = user.TwoFactorEnabled, hasKeys });
    }

    [Authorize]
    [HttpPost("two-factor")]
    public async Task<IActionResult> SetTwoFactor([FromBody] TwoFactorRequest body) {
        var user = await mongo.GetUserCollection()
            .Find(u => u.Username == CurrentUsername).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        if (body.Enabled) {
            var hasKeys = await Creds.Find(c => c.UserId == user.Id).AnyAsync();
            if (!hasKeys)
                return BadRequest("Register a security key before enabling 2FA.");
        }

        await mongo.GetUserCollection().UpdateOneAsync(
            u => u.Id == user.Id,
            Builders<User>.Update.Set(u => u.TwoFactorEnabled, body.Enabled));

        return Ok(new { ok = true, enabled = body.Enabled });
    }
}
