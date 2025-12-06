<?php

namespace Winden\App\Helpers;

class FileManager
{
  public static function find_path($path = '', $base = ABSPATH, $toFind = 'wp-content')
  {
      $fullPath = rtrim($base, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . trim($path, DIRECTORY_SEPARATOR);
      if(self::isWindows()) {
        $fullPath = realpath($base . DIRECTORY_SEPARATOR . trim($path, DIRECTORY_SEPARATOR));
      }

      if (!$fullPath || !is_dir($fullPath) || !is_readable($fullPath)) {
          return null;
      }

      $items = scandir($fullPath);
      $to_find_path = '';

      foreach ($items as $item) {
          if ($item == '.' || $item == '..') continue;

          $itemPath = rtrim($fullPath, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . trim($item, DIRECTORY_SEPARATOR);

          if (is_dir($itemPath)) {
              $subDirs = self::find_path($item, $fullPath, $toFind);

              // Check if the current directory has the name $toFind
              if ($item == $toFind) {
                  $to_find_path = ltrim(str_replace(ABSPATH, '', $itemPath), DIRECTORY_SEPARATOR);
              } else {
                  foreach ($subDirs as $subDir) {
                      if ($subDir['name'] == $toFind) {
                          $to_find_path = ltrim(str_replace(ABSPATH, '', $itemPath), DIRECTORY_SEPARATOR);
                          break;
                      }
                  }
              }
          }
      }

      return $to_find_path;
  }

  public static function list_wp_directories($path, $file_formats = [])
  {
    try {
      // Ensure we have a valid path
      $base_path = WP_CONTENT_DIR;
      $search_path = !empty($path) ? $path : '/';
      $full_path = rtrim($base_path, '/') . '/' . trim($search_path, '/');

      if (!file_exists($full_path)) {
        return [];
      }

      $files = [];
      $iterator = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($full_path, \RecursiveDirectoryIterator::SKIP_DOTS),
        \RecursiveIteratorIterator::SELF_FIRST
      );

      foreach ($iterator as $file) {
        if ($file->isFile()) {
          $extension = strtolower($file->getExtension());

          // If no specific formats are specified or if the file extension is in the allowed formats
          if (empty($file_formats) || in_array($extension, $file_formats)) {
            $files[] = $file->getPathname();
          }
        }
      }

      return $files;
    } catch (\Exception $e) {
      return [];
    }
  }

  public static function list_directory_contents($directory, $extensions)
  {
    $directory = self::defaultPathIfEmpty($directory);
    $directory = self::getRealPath($directory);
    
    // Check if the directory is readable
    if (!is_dir($directory) || !is_readable($directory)) {
        return [];
    }

    $contents = [];

    $directory = rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    $items = scandir($directory);

    foreach ($items as $item) {
        if ($item != '.' && $item != '..') {
          if($item == "node_modules") continue;
            $fullPath = $directory . $item;

            if(is_file($fullPath)) {
              if(count($extensions) <= 0 || in_array(pathinfo($fullPath, PATHINFO_EXTENSION), $extensions)) {
                $contents[] = $fullPath;
              }
            } else {
              $files = self::list_directory_contents($fullPath, $extensions);
              $contents = array_merge($contents, $files);
            }
        }
    }

    return $contents;
  }

  // public function to get file contents
  public static function get_file_contents($file)
  {
    try {
      if (!file_exists($file)) {
        return false;
      }

      $content = file_get_contents($file);
      if ($content === false) {
        return false;
      }

      return $content;
    } catch (\Exception $e) {
      return false;
    }
  }
  
  public static function isWindows()
  {
    return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
  }
  
  public static function defaultPathIfEmpty($path)
  {
    if ($path === null || $path === '' || $path === '/') {
      $path = ABSPATH;
    }
    
    return $path;
  }
  
  public static function getRealPath($path)
  {
    if(self::isWindows()) {
      $path = realpath(trim($path, DIRECTORY_SEPARATOR));
    }
    
    return $path;
  }
}
