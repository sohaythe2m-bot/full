<?php

echo "PHP OK<br>";

echo "Version: " . PHP_VERSION . "<br>";

echo "mkdir: ";
var_dump(@mkdir(__DIR__ . "/testfolder"));

echo "<br>is writable: ";
var_dump(is_writable(__DIR__));

echo "<br>curl: ";
var_dump(function_exists("curl_init"));

echo "<br>json: ";
var_dump(function_exists("json_encode"));

echo "<br>openssl: ";
var_dump(extension_loaded("openssl"));