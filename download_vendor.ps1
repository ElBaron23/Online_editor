$ErrorActionPreference = "Continue"

$urls = @(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/codemirror.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/theme/monokai.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/show-hint.min.css",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/lint/lint.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/codemirror.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/mode/xml/xml.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/mode/javascript/javascript.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/mode/css/css.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/mode/htmlmixed/htmlmixed.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/edit/closebrackets.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/edit/closetag.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/show-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/xml-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/html-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/css-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/hint/javascript-hint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jshint/2.13.6/jshint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/csslint/1.0.5/csslint.js",
    "https://cdnjs.cloudflare.com/ajax/libs/htmlhint/1.1.13/htmlhint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/lint/lint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/lint/javascript-lint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/lint/css-lint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.1/addon/lint/html-lint.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.7/beautifier.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.7/beautify-html.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.7/beautify-css.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.ttf",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compat.woff2",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-v4compat.ttf"
)

$baseDir = "c:\Users\Baron\Desktop\Online_editor\assets\vendor"

foreach ($url in $urls) {
    $localPath = ""
    if ($url -match "font-awesome/.*/webfonts/(.*)") {
        $localPath = "$baseDir\font-awesome\webfonts\$($matches[1])"
    } elseif ($url -match "font-awesome/.*/css/(.*)") {
        $localPath = "$baseDir\font-awesome\css\$($matches[1])"
    } elseif ($url -match "bootstrap.*/css/(.*)") {
        $localPath = "$baseDir\bootstrap\css\$($matches[1])"
    } elseif ($url -match "bootstrap.*/js/(.*)") {
        $localPath = "$baseDir\bootstrap\js\$($matches[1])"
    } elseif ($url -match "codemirror.*/(codemirror\.min\.css|codemirror\.min\.js)") {
        $localPath = "$baseDir\codemirror\$($matches[1])"
    } elseif ($url -match "codemirror.*/theme/(.*)") {
        $localPath = "$baseDir\codemirror\theme\$($matches[1])"
    } elseif ($url -match "codemirror.*/addon/(.*)") {
        $localPath = "$baseDir\codemirror\addon\$($matches[1])"
    } elseif ($url -match "codemirror.*/mode/(.*)") {
        $localPath = "$baseDir\codemirror\mode\$($matches[1])"
    } elseif ($url -match "jszip.*/(.*)") {
        $localPath = "$baseDir\jszip\$($matches[1])"
    } elseif ($url -match "jshint.*/(.*)") {
        $localPath = "$baseDir\jshint\$($matches[1])"
    } elseif ($url -match "csslint.*/(.*)") {
        $localPath = "$baseDir\csslint\$($matches[1])"
    } elseif ($url -match "htmlhint.*/(.*)") {
        $localPath = "$baseDir\htmlhint\$($matches[1])"
    } elseif ($url -match "js-beautify.*/(.*)") {
        $localPath = "$baseDir\js-beautify\$($matches[1])"
    }
    
    if ($localPath) {
        $dir = Split-Path $localPath
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        Write-Host "Downloading $url to $localPath"
        Invoke-WebRequest -Uri $url -OutFile $localPath
    } else {
        Write-Host "Unmatched URL: $url"
    }
}
Write-Host "Download complete!"
