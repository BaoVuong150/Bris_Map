using System;
using System.Collections.Generic;
using Microsoft.OpenApi;

var req = new OpenApiSecurityRequirement
{
    [new OpenApiSecuritySchemeReference("Bearer")] = new List<string>()
};
Console.WriteLine("OK");
