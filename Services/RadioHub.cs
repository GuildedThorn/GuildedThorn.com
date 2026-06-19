using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GuildedThorn.com.Services;

// Anonymous companion to ChatHub: lets every visitor (logged in or not) receive
// an instant "radio is live" toast while they're on the site. The server pushes
// to clients via IHubContext<RadioHub>; clients don't invoke anything here.
[AllowAnonymous]
public class RadioHub : Hub {
}
