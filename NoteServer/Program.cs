using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

// 1. Настройки сервисов
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=notes.db"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// 2. Инициализация базы
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// 3. ПУТИ (ЭНДПОИНТЫ) — вся логика ТУТ
app.MapGet("/notes", async (AppDbContext db) =>
{
    return await db.Notes.ToListAsync();
});

app.MapPost("/notes", async (AppDbContext db, Note note) =>
{
    db.Notes.Add(note);
    await db.SaveChangesAsync();
    return Results.Ok(note);
});

app.MapDelete("/delete-note/{id}", async (AppDbContext db, int id) =>
{
    var note = await db.Notes.FindAsync(id);
    if (note == null) return Results.NotFound();
    db.Notes.Remove(note);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// Наш новый путь для сохранения картинок
app.MapPut("/update-note-image/{id}", async (AppDbContext db, int id, UpdateImageRequest request) =>
{
    var note = await db.Notes.FindAsync(id);
    if (note == null) return Results.NotFound();

    note.Image = request.Image; // Сохраняем строку картинки в базу

    await db.SaveChangesAsync();
    return Results.Ok();
});

// 4. ЗАПУСК
app.Run();

// 5. КЛАССЫ И МОДЕЛИ — строго в самом низу файла!
public record UpdateImageRequest(string Image);

public class Note
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Text { get; set; } = "";
    public string pageName { get; set; } = "";
    public string? Image { get; set; }
    public string Color { get; set; } = "#ffffff";

}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Note> Notes => Set<Note>();
}


