# DataExchange Frontend

Frontend thuần HTML, CSS, JavaScript cho website lưu trữ và trao đổi **văn bản (text)** qua REST API C# ASP.NET Core.

## 1. Chạy thử

1. Giải nén thư mục.
2. Mở `app.js`.
3. Sửa `API_BASE` thành địa chỉ Backend ASP.NET Core của bạn, ví dụ `https://localhost:7001`.
4. Chạy Backend.
5. Mở `index.html` bằng trình duyệt (khuyên dùng extension Live Server trong VS Code).

> Đăng nhập và các thao tác dữ liệu chỉ hoạt động khi Backend đã được xây dựng đúng API contract bên dưới. Giao diện không tự lưu dữ liệu vào SQL Server.

## 2. API contract Frontend đang sử dụng

### Đăng nhập

`POST /api/auth/login`

Request:
```json
{
  "username": "demo",
  "password": "123456"
}
```

Response thành công:
```json
{
  "token": "JWT_ACCESS_TOKEN"
}
```

Frontend lưu token trong `sessionStorage`, sau đó gửi header:
`Authorization: Bearer JWT_ACCESS_TOKEN`

### Lấy danh sách dữ liệu

`GET /api/data`

Response:
```json
[
  {
    "id": 1,
    "title": "Ghi chú",
    "content": "Nội dung văn bản cần lưu",
    "createdAt": "2026-11-12T10:00:00",
    "updatedAt": null
  }
]
```

API cũng có thể trả `{ "data": [...] }`.

### Thêm dữ liệu

`POST /api/data`

Request:
```json
{
  "title": "Ghi chú",
  "content": "Nội dung văn bản cần lưu"
}
```

### Cập nhật dữ liệu

`PUT /api/data/{id}`

Request giống API thêm dữ liệu.

### Xóa dữ liệu

`DELETE /api/data/{id}`

Trả `204 No Content` hoặc một response 2xx khác.

## 3. Gợi ý DTO C# tương ứng

```csharp
public class LoginRequest
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public class LoginResponse
{
    public string Token { get; set; } = "";
}

public class DataRequest
{
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
}

public class DataResponse
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
```

ASP.NET Core mặc định thường serialize tên thuộc tính JSON theo camelCase (`CreatedAt` thành `createdAt`), khớp với Frontend.

## 4. CORS trong ASP.NET Core

Nếu Frontend và Backend chạy khác origin/port, hãy bật CORS trong Backend. Ví dụ trong `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins("http://127.0.0.1:5500", "http://localhost:5500")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Sau khi build app:
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
```

Thứ tự middleware cần phù hợp với cấu hình ứng dụng của bạn. Không dùng `AllowAnyOrigin` kèm credentials.

## 5. Lưu ý bảo mật

- Chỉ triển khai thật qua HTTPS.
- Backend phải xác thực JWT và kiểm tra quyền sở hữu dữ liệu ở mọi API; không chỉ dựa vào việc Frontend ẩn/hiện giao diện.
- Không lưu mật khẩu người dùng ở Frontend.
- `sessionStorage` chỉ là cách lưu token đơn giản cho bản mẫu. Với ứng dụng production, cân nhắc cookie `HttpOnly`, `Secure`, `SameSite` và cơ chế chống CSRF phù hợp.
- Nội dung text được hiển thị dưới dạng text đã escape HTML để tránh chèn mã HTML/JavaScript.
