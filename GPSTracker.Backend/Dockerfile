FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy solution and project files
COPY GPSTracker.slnx ./
COPY src/GPSTracker.WebAPI/GPSTracker.WebAPI.csproj src/GPSTracker.WebAPI/

# Restore dependencies
RUN dotnet restore src/GPSTracker.WebAPI/GPSTracker.WebAPI.csproj

# Copy all source code
COPY src/ src/

# Publish the application
RUN dotnet publish src/GPSTracker.WebAPI/GPSTracker.WebAPI.csproj -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/out ./

# Expose port (ASP.NET Core 8.0+ defaults to 8080)
EXPOSE 8080

ENTRYPOINT ["dotnet", "GPSTracker.WebAPI.dll"]
