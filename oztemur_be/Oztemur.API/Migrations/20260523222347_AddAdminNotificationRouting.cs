using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Oztemur.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminNotificationRouting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AdminNotificationProfileId",
                table: "EmailRoutings",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNotificationProfileId",
                table: "EmailRoutings");
        }
    }
}
