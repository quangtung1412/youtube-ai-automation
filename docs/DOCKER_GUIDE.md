# Hướng Dẫn Sử Dụng Docker

## Yêu Cầu
- Docker Desktop đã được cài đặt
- Docker Compose (thường đi kèm với Docker Desktop)

## Cách Sử Dụng

### 1. Chuẩn Bị Environment Variables

Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Sau đó chỉnh sửa file `.env` với các giá trị thực tế của bạn:
- `NEXTAUTH_SECRET`: Tạo một chuỗi ngẫu nhiên bảo mật
- `GEMINI_API_KEY`: API key của Google Gemini
- `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`: (Tùy chọn) Nếu sử dụng YouTube integration

### 2. Build và Chạy với Docker Compose (Khuyến Nghị)

```bash
# Build và chạy
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng container
docker-compose down

# Dừng và xóa volumes (xóa database)
docker-compose down -v
```

### 3. Build và Chạy với Docker (Không dùng Compose)

```bash
# Build image
docker build -t youtube-ai-automation .

# Chạy container
docker run -d \
  --name youtube-ai-automation \
  -p 6789:6789 \
  -v $(pwd)/prisma:/app/prisma \
  -e DATABASE_URL="file:./prisma/dev.db" \
  -e NEXTAUTH_URL="http://localhost:6789" \
  -e NEXTAUTH_SECRET="your-secret" \
  -e GEMINI_API_KEY="your-api-key" \
  youtube-ai-automation

# Xem logs
docker logs -f youtube-ai-automation

# Dừng container
docker stop youtube-ai-automation

# Xóa container
docker rm youtube-ai-automation
```

### 4. Truy Cập Ứng Dụng

Mở trình duyệt và truy cập: `http://localhost:6789`

## Database Management

### Chạy Prisma Migrations trong Container

```bash
# Với Docker Compose
docker-compose exec app npx prisma migrate deploy

# Với Docker
docker exec youtube-ai-automation npx prisma migrate deploy
```

### Seed Database

```bash
# Với Docker Compose
docker-compose exec app npx prisma db seed

# Với Docker
docker exec youtube-ai-automation npx prisma db seed
```

### Prisma Studio (Database GUI)

```bash
# Với Docker Compose
docker-compose exec app npx prisma studio

# Với Docker
docker exec -it youtube-ai-automation npx prisma studio
```

Sau đó truy cập: `http://localhost:5555`

## Sử Dụng PostgreSQL (Thay Vì SQLite)

Nếu muốn sử dụng PostgreSQL cho production:

1. Uncomment phần PostgreSQL trong `docker-compose.yml`
2. Cập nhật `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Chạy lại:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Troubleshooting

### Container không start được

```bash
# Xem logs chi tiết
docker-compose logs app

# Hoặc
docker logs youtube-ai-automation
```

### Database issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

### Rebuild sau khi thay đổi code

```bash
# Với Docker Compose
docker-compose up -d --build

# Với Docker
docker build -t youtube-ai-automation .
docker stop youtube-ai-automation
docker rm youtube-ai-automation
# Chạy lại docker run...
```

## Production Deployment

Khi deploy lên production:

1. **Đổi NEXTAUTH_SECRET**: Tạo một chuỗi ngẫu nhiên mạnh
   ```bash
   openssl rand -base64 32
   ```

2. **Cập nhật NEXTAUTH_URL**: Thay đổi thành domain thực tế
   ```
   NEXTAUTH_URL=https://yourdomain.com
   ```

3. **Sử dụng PostgreSQL**: Thay vì SQLite cho production

4. **Enable HTTPS**: Sử dụng reverse proxy như Nginx hoặc Traefik

5. **Backup Database**: Thiết lập backup tự động cho database

## Lưu Ý

- Database SQLite được lưu trong thư mục `prisma/` và được mount vào container
- Public files được mount để persist uploads
- Container sẽ tự động restart nếu crash (trừ khi bạn stop manually)
