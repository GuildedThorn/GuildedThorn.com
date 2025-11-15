using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using RabbitMQ.Client;

namespace GuildedThorn.com.Services;

public class RabbitMqService {
    private readonly IConfiguration _configuration;

    private readonly IConnection _connection;
    private readonly IChannel _channel;

    public RabbitMqService(IConfiguration configuration) {
        _configuration = configuration;
        var factory = new ConnectionFactory() {
            HostName = _configuration["RabbitMQ:HostName"] ?? "localhost",
            UserName = _configuration["RabbitMQ:Username"] ?? "guest",
            Password = _configuration["RabbitMQ:Password"] ?? "guest",
        };

        _connection = factory.CreateConnectionAsync().GetAwaiter().GetResult();
        _channel = _connection.CreateChannelAsync().GetAwaiter().GetResult();

        _channel.QueueDeclareAsync(
            queue: "guestbook_messages",
            durable: true,
            exclusive: false,
            autoDelete: false,
            arguments: null);
    }

    public async Task PublishGuestbookMessageAsync(string name, string message,
        CancellationToken ct = default) {
        var payload = JsonSerializer.Serialize(new {
            Name = name,
            Message = message,
            Date = DateTime.UtcNow
        });

        var body = Encoding.UTF8.GetBytes(payload);

        await _channel.BasicPublishAsync(
            exchange: "",
            routingKey: "guestbook_messages",
            body: body.AsMemory(),
            cancellationToken: ct
        );
    }
}