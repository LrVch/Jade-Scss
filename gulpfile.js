var gulp = require("gulp"),
  RS_CONF = require('./rs-conf.js'),
  browserSync = require("browser-sync").create(),
  notify = require('gulp-notify'),
  minifyCss = require('gulp-minify-css'),
  rename = require('gulp-rename'),
  autoprefixer = require('gulp-autoprefixer'),
  del = require("del"),
  gutil = require("gulp-util"),
  concatCss = require("gulp-concat-css"),
  gulpif = require("gulp-if"),
  uglify = require("gulp-uglify"),
  imagemin = require("gulp-imagemin"),
  uncss = require('gulp-uncss'),
  filter = require("gulp-filter"),
  ftp = require("vinyl-ftp"),
  wiredep = require("wiredep").stream,
  useref = require("gulp-useref"),
  size = require("gulp-size"),
  compass = require('gulp-compass'),
  jade = require('gulp-jade'),
  plumber = require('gulp-plumber'),
  // До выхода gulp 4 версии временное решение
  //runSequence = require('run-sequence'),
  bootlint  = require('gulp-bootlint'),
  //Promise = require('es6-promise').Promise,
  replace = require('gulp-replace'),
  svgSprite = require('gulp-svg-sprite'),
  inject = require('gulp-inject');


// * ====================================================== *
//   DEV
// * ====================================================== *

// bootlint
// ******************************************************
gulp.task('bootlint', function() {

  gulp.src(RS_CONF.path.htmlDir)
    .pipe(bootlint({
        //stoponerror: true,
        //stoponwarning: true,
        loglevel: 'debug',
        disabledIds: ['W012'],
        reportFn: function(file, lint, isError, isWarning, errorLocation) {
          var message = (isError) ? "ERROR! - " : "WARN! - ";
          if (errorLocation) {
              message += file.path + ' (line:' + (errorLocation.line + 1) + ', col:' + (errorLocation.column + 1) + ') [' + lint.id + '] ' + lint.message;
          } else {
              message += file.path + ': ' + lint.id + ' ' + lint.message;
          }
          console.log(message);
        },
        summaryReportFn: function(file, errorCount, warningCount, errorMessage) {
          if (errorCount > 0 || warningCount > 0) {
              console.log("please fix the " + errorCount + " errors and "+ warningCount + " warnings in " + file.path);
          } else {
              errorMessage = "No problems found";
              console.log("No problems found in "+ file.path);
          }
        }
    })).pipe(notify({
      message: function(file) {
        if (file.bootlint.success) {
          return;
        }
        var errorMessage = "You have errors"
        return errorMessage;
      },
      title: "Bootlint"
    }));
});

// autoprefixer
// ******************************************************
gulp.task('autoprefixer', function () {
  return gulp.src(RS_CONF.path.cssDir)
    .pipe(autoprefixer({
      browsers: ['last 6 versions', "ie 8"],
      cascade: false
    }))
    .pipe(gulp.dest(RS_CONF.path.cssDirDest));
});

// wiredep
// ******************************************************
gulp.task("wiredep-bower", function () {
  gulp.src(RS_CONF.path.jadeWiredepSrc)
    .pipe(wiredep({
      directory: RS_CONF.path.bowerDir,
      overrides: {
        "qtip2": {
          "main": ["./jquery.qtip.min.js", "./jquery.qtip.min.css"],
          "dependencies": {
            "jquery": ">=1.6.0"
          }
        },
        "bootstrap-sass": {
          "main": [
            // "./assets/javascripts/bootstrap/collapse.js",
            // "./assets/javascripts/bootstrap/transition.js",
            // "./assets/javascripts/bootstrap/scrollspy.js",
            // "./assets/javascripts/bootstrap/modal.js",
            // "./assets/javascripts/bootstrap/tooltip.js"
          ]  // подключение bootstrap js в html
        },
        "formstone": {
          "main": [
            // "./dist/js/core.js",
            // "./dist/js/number.js",
            // "./dist/css/number.css",
          ]
        },
        "jquery.inputmask": {
          "main": [
            // "./dist/inputmask/inputmask.js",
            // "./dist/inputmask/inputmask.extensions.js",
            // "./dist/inputmask/jquery.inputmask.js",
          ]
        },
        "select2": {
          "main": [
            // "dist/js/select2.js",
            // "dist/css/select2.css"
          ],
        }
      },
      exclude: ["bower/modernizr/", "bower/normalize-css"],  //если надо включить модернизр удали его от сюда
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest(RS_CONF.path.jadeWiredepDist));
});

// jade
// ******************************************************
gulp.task('jade', function () {
  gulp.src(RS_CONF.path.jadeCompiled)
    .pipe(plumber())
    .pipe(jade({
      pretty: '\t',
    }))
    .on("error", notify.onError({
        message: 'Error: <%= error.message %>',
        title: "Jade",
        sound: false // deactivate sound?
    }))
    .pipe(gulp.dest(RS_CONF.path.jadeDestination));
});

// scss-compass
// ******************************************************
gulp.task('compass', function () {
  gulp.src(RS_CONF.path.scssDir)
    .pipe(plumber())
    .pipe(compass({
      config_file: RS_CONF.path.compassConfig,
      css: RS_CONF.path.cssDirDest,
      sass: RS_CONF.path.scssDirDest,
      image: RS_CONF.path.iconDir
    }))
    .on("error", notify.onError({
        message: 'Error: <%= error.message %>',
        title: "Compass",
        sound: false // deactivate sound?
    }));
});

// inline-svg-inject
// ******************************************************
gulp.task('inject-svg-inline', function () {

  function fileContents (filePath, file, i, length) {
    return file.contents.toString('utf8');
  }

  var sources = gulp.src(RS_CONF.path.iconsSvgDir)
    .pipe(svgSprite({
      mode: {
        symbol: true
      },
      shape: {
        transform: [{
          svgo: {
            plugins: [
              {convertShapeToPath: true},
              {convertPathData: true},
              {mergePaths: true},
              {convertTransform: true},
              {removeUnusedNS: true},
              {cleanupIDs: true},
              {cleanupNumericValues: true},
              {removeUselessStrokeAndFill: true},
              {removeHiddenElems: true},
              {removeDoctype: false}
            ]
          }
        }]
      }
    }));

  return gulp
    .src('./app/*.html')
    .pipe(inject(sources, { transform: fileContents }))
    .pipe(gulp.dest('./app'))
    .pipe(browserSync.stream());

});


// reload-after-html-changed
// ******************************************************
gulp.task('reload-after-inject-svg-inline', ['inject-svg-inline'], browserSync.reload);


// browsersync front-end
// ******************************************************
gulp.task("server", ["compass", "wiredep-bower", "autoprefixer", "jade", "bootlint", "inject-svg-inline"], function () {

  browserSync.init({
    port: 3000,
    open: false,
    notify: false,
    server: {
      baseDir: RS_CONF.path.baseDir
    }
  });

  gulp.watch("bower.json", ["wiredep-bower"]);
  gulp.watch(RS_CONF.path.jadeLocation, ["jade"]);
  gulp.watch(RS_CONF.path.scssDir, ["compass"]);
  gulp.watch(RS_CONF.path.cssDir, ["autoprefixer"]).on("change", browserSync.reload);
  gulp.watch(RS_CONF.path.htmlDir, ["bootlint", "reload-after-inject-svg-inline"]);
  // gulp.watch(RS_CONF.path.htmlDir, ["bootlint", "reload-after-html-changed"]).on("change", browserSync.reload);
  gulp.watch(RS_CONF.path.jsDir).on("change", browserSync.reload);
});

// browsersync local-host
// ******************************************************
gulp.task("local-host", ["compass", "wiredep-bower", "autoprefixer", "jade", "bootlint"], function () {

  browserSync.init({
    proxy: "projectName/app"
  });

  gulp.watch("bower.json", ["wiredep-bower"]);
  gulp.watch(RS_CONF.path.jadeLocation, ["jade"]);
  gulp.watch(RS_CONF.path.scssDir, ["compass"]);
  gulp.watch(RS_CONF.path.cssDir, ["autoprefixer"]).on("change", browserSync.reload);
  gulp.watch(RS_CONF.path.htmlDir, ["bootlint"]).on("change", browserSync.reload);
  gulp.watch(RS_CONF.path.jsDir).on("change", browserSync.reload);
});

// default
// ******************************************************
gulp.task("default", ["server"]);

// local
// ******************************************************
gulp.task("local", ["local-host"]);

var log = function (error) {
  console.log([
        "",
        "----------ERROR MESSAGE START----------",
    ("[" + error.name + " in " + error.plugin + "]"),
        error.message,
        "----------ERROR MESSAGE END----------",
        ""
    ].join("\n"));
  this.end();
}


// * ====================================================== *
//   BUILD
// * ====================================================== *


// Переносим CSS JS HTML в папку DIST (useref)
// ******************************************************
gulp.task("useref", function () {
  return gulp.src(RS_CONF.path.htmlDir)
    .pipe(useref())
    .pipe(gulpif("*.js", uglify()))
    .pipe(gulpif("*.css", minifyCss({
       compatibility: "ie8"
     })))
    .pipe(gulp.dest(RS_CONF.path.distDir));
});

// Очищаем директорию DIST
// ******************************************************
gulp.task("clean-dist", function () {
  return del(RS_CONF.path.distDelDir);
});

// Запускаем локальный сервер для DIST
// ******************************************************
gulp.task("dist-server", function () {
  browserSync.init({
    port: 2000,
    open: false,
    notify: false,
    server: {
      baseDir: RS_CONF.path.distDir
    }
  });
});

// Перенос шрифтов
// ******************************************************
gulp.task("fonts", function () {
  gulp.src(RS_CONF.path.fontsDir)
    .pipe(filter(["*.eot", "*.svg", "*.ttf", "*.woff", "*.woff2"]))
    .pipe(gulp.dest(RS_CONF.path.distFontsDir))
});

// Перенос шрифтов bootstrap
// ******************************************************
gulp.task("bootstrapFonts", function () {
  gulp.src(RS_CONF.path.bootstrapFontsDir)
    .pipe(filter(["*.eot", "*.svg", "*.ttf", "*.woff", "*.woff2"]))
    .pipe(gulp.dest(RS_CONF.path.distBootstrapFontsDir))
});

// Перенос картинок
// ******************************************************
gulp.task("images", function () {
  return gulp.src(RS_CONF.path.imgDir)
    .pipe(imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(filter(["*.jpg", "*.svg", "*.jpeg", "*.png", "*.webp", "*.gif", "!/icons"]))
    .pipe(gulp.dest(RS_CONF.path.distImgDir));
});

// Перенос остальных файлов (favicon и т.д.)
// ******************************************************
gulp.task("extras", function () {
  return gulp.src(RS_CONF.path.extraFiles)
    .pipe(gulp.dest(RS_CONF.path.distDir));
});

// Перенос временного(тестового) php
// ******************************************************
gulp.task("php", function () {
  return gulp.src(RS_CONF.path.baseDir + "/php/*.php")
    .pipe(gulp.dest(RS_CONF.path.distDir + "/php"));
});

// Вывод размера папки APP
// ******************************************************
gulp.task("size-app", function () {
  return gulp.src(RS_CONF.path.allAppFiles).pipe(size({
    title: "APP size: "
  }));
});

// Сборка и вывод размера папки DIST
// ******************************************************
gulp.task("dist", ["useref", "images", "fonts", "bootstrapFonts", "extras", "php", "size-app"], function () {
  return gulp.src(RS_CONF.path.allDistFiles).pipe(size({
    title: "DIST size: "
  }));
});

// Собираем папку DIST - только когда файлы готовы
// ******************************************************
gulp.task("build", ["clean-dist", "wiredep-bower"], function () {
  gulp.start("dist");  // с wiredep-bower
});


// * ====================================================== *
//   DEPLOY
// * ====================================================== *


// Отправка проекта на сервер
// ******************************************************
gulp.task("deploy", function () {
  var conn = ftp.create({
    host: RS_CONF.conn.host,
    user: RS_CONF.conn.user,
    password: RS_CONF.conn.password,
    parallel: 10,
    log: gutil.log
  });

  return gulp.src(RS_CONF.conn.src, {
      base: RS_CONF.conn.base,
      buffer: false
    })
    .pipe(conn.dest(RS_CONF.conn.folder));
});





// * ====================================================== *
//   Резерв
// * ====================================================== *

// uncss неработает пока
// ******************************************************
gulp.task('uncss', function () {
  return gulp.src('app/css/style.min.css')
    .pipe(uncss({
      html: ['app/**/*.html']
    }))
    .pipe(gulp.dest('app/css/style.min.css'));
});