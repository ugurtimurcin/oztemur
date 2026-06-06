# syntax=docker/dockerfile:1
# Multi-stage build for the Oztemur .NET 10 API.
# Build context is this folder: oztemur_be/Oztemur.API

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore as its own layer so NuGet downloads are cached between builds.
COPY Oztemur.API.csproj ./
RUN dotnet restore Oztemur.API.csproj

# Copy the rest of the source and publish a Release build.
COPY . ./
RUN dotnet publish Oztemur.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish ./

# Azure App Service (Linux containers) routes inbound traffic to this port.
# Set WEBSITES_PORT=8080 in the Web App configuration to match.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Oztemur.API.dll"]
