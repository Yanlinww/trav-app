FROM php:8.2-apache

# 執行指令：安裝並啟用 mysqli 擴充套件，這樣才能連上 Aiven 雲端資料庫
RUN docker-php-ext-install mysqli && docker-php-ext-enable mysqli

# 賦予資料夾權限 (避免寫入錯誤)
RUN chown -R www-data:www-data /var/www/html