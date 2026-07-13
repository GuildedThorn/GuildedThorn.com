using System;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;

namespace GuildedThorn.com.Services;

// Thin wrapper around a self-hosted, S3-compatible object store (SeaweedFS)
// used for anything that used to be "just a file on disk" — gallery uploads,
// radio recordings. The point: none of that data lives anywhere a deploy
// (dotnet publish / bun run build, which both touch the app's own working
// tree) could ever reach, so a redeploy structurally cannot lose it.
//
// Buckets aren't created here — create them once yourself (SeaweedFS admin
// UI or `mc mb`) before pointing config at them.
public class S3StorageService {
    private readonly IAmazonS3 _client;
    private readonly TransferUtility _transferUtility;

    public S3StorageService(IConfiguration configuration) {
        var config = new AmazonS3Config {
            ServiceURL = configuration["Storage:S3Endpoint"]
                ?? throw new InvalidOperationException("Storage:S3Endpoint not configured."),
            ForcePathStyle = true,
            AuthenticationRegion = configuration["Storage:S3Region"] ?? "us-east-1",
        };

        _client = new AmazonS3Client(
            configuration["Storage:S3AccessKey"] ?? throw new InvalidOperationException("Storage:S3AccessKey not configured."),
            configuration["Storage:S3SecretKey"] ?? throw new InvalidOperationException("Storage:S3SecretKey not configured."),
            config);

        _transferUtility = new TransferUtility(_client);
    }

    public Task UploadAsync(string bucket, string key, Stream stream, string? contentType) =>
        _transferUtility.UploadAsync(new TransferUtilityUploadRequest {
            BucketName = bucket,
            Key = key,
            InputStream = stream,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            AutoCloseStream = false,
        });

    // For content assembled to a local temp file first (e.g. a live radio
    // broadcast) rather than already held as a Stream. TransferUtility
    // multiparts large files automatically.
    public Task UploadFileAsync(string bucket, string key, string filePath, string? contentType) =>
        _transferUtility.UploadAsync(new TransferUtilityUploadRequest {
            BucketName = bucket,
            Key = key,
            FilePath = filePath,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
        });

    public async Task DeleteAsync(string bucket, string key) {
        try {
            await _client.DeleteObjectAsync(bucket, key);
        } catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound) {
            // already gone
        }
    }

    // Lets clients (browsers, LavaLink) fetch straight from SeaweedFS instead
    // of proxying the bytes through this app.
    public Task<string> GetPresignedUrlAsync(string bucket, string key, TimeSpan expiry) =>
        _client.GetPreSignedURLAsync(new GetPreSignedUrlRequest {
            BucketName = bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(expiry),
        });
}
