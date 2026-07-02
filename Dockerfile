FROM php:8.2-apache

# 安裝 mysqli
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# 關鍵：改成對應你現有的 backend/trav-api 資料夾
COPY backend/trav-api/ /var/www/html/

# 賦予權限
RUN chown -R www-data:www-data /var/www/html