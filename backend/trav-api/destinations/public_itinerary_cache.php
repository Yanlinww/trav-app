<?php

const PUBLIC_ITINERARY_CACHE_TTL_SECONDS = 60;

function public_itinerary_cache_directory(): string {
    $directory = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'travmate-public-itinerary-cache';
    if (!is_dir($directory)) @mkdir($directory, 0775, true);
    return $directory;
}

function public_itinerary_cache_read(string $key): ?array {
    $path = public_itinerary_cache_directory() . DIRECTORY_SEPARATOR . $key . '.json';
    if (!is_file($path) || filemtime($path) < time() - PUBLIC_ITINERARY_CACHE_TTL_SECONDS) return null;
    $payload = json_decode((string)@file_get_contents($path), true);
    return is_array($payload) ? $payload : null;
}

function public_itinerary_cache_write(string $key, array $payload): void {
    $directory = public_itinerary_cache_directory();
    $target = $directory . DIRECTORY_SEPARATOR . $key . '.json';
    $temporary = tempnam($directory, 'public-itinerary-');
    if ($temporary === false) return;
    if (file_put_contents($temporary, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX) !== false) {
        @rename($temporary, $target);
    }
    if (is_file($temporary)) @unlink($temporary);
}

function invalidate_public_itinerary_cache(): void {
    foreach (glob(public_itinerary_cache_directory() . DIRECTORY_SEPARATOR . '*.json') ?: [] as $path) {
        @unlink($path);
    }
}
