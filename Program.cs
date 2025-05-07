using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

// Add services
services.AddControllers();
services.AddEndpointsApiExplorer();
services.AddSwaggerGen();

services.AddSingleton<RadioService>();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseStaticFiles(); // For wwwroot (your frontend)A
app.UseRouting();
app.UseAuthorization();

// Map Controllers
app.MapControllers();

// Optional SPA fallback if you're using React routing
app.MapFallbackToFile("index.html");

app.Run();