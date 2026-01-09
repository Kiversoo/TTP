using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

var builder = WebApplication.CreateBuilder(args);

// Настраиваем базу данных
builder.Services.AddDbContext<AppDbContext>(options => 
    options.UseSqlite("Data Source=notes.db"));

// Настраиваем доступ для фронтенда
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Создаем базу при старте
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors();

// ПУТИ (Эндпоинты)
app.MapGet("/notes", async (AppDbContext db) => await db.Notes.ToListAsync());

app.MapPost("/add-note", async (AppDbContext db, Note note) => {
    db.Notes.Add(note);
    await db.SaveChangesAsync();
    return Results.Ok(new { message = "Заметка в базе!" });
});

app.Run();

// КЛАССЫ (Обязательно в самом низу!)
public class Note {
    public int Id { get; set; }
    public string Text { get; set; } = "";
}

public class AppDbContext : DbContext {
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Note> Notes => Set<Note>();
}