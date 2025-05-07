using GuildedThorn.com.Services;
using Microsoft.AspNetCore.Mvc;

namespace GuildedThorn.com.Controllers;

[ApiController]
[Route("/api/[controller]")]
public class RadioController(RadioService service) : ControllerBase  {
    private RadioService _service = service;
    
    
}