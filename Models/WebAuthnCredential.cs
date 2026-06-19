using System;

namespace GuildedThorn.com.Models;

// A registered WebAuthn / FIDO2 authenticator (e.g. a YubiKey) bound to a user.
public class WebAuthnCredential {
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;

    // Raw credential id returned by the authenticator.
    public byte[] CredentialId { get; set; } = Array.Empty<byte>();
    // COSE public key used to verify assertions.
    public byte[] PublicKey { get; set; } = Array.Empty<byte>();
    // The user handle (Fido2User.Id) — proves discoverable-credential ownership.
    public byte[] UserHandle { get; set; } = Array.Empty<byte>();
    // Signature counter for cloned-authenticator detection.
    public uint SignCount { get; set; }
    public string CredType { get; set; } = string.Empty;

    public string Nickname { get; set; } = "Security key";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
}
