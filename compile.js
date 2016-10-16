#!/usr/bin/env node

/**
 * Created by vitalik on 16-10-15.
 */

var metaMarked =    require("meta-marked"),
    fs =            require("fs-extra"),
    yamljs =        require("yamljs"),
    fswf =          require("safe-write-file");

var API_HOST = "http://com.cryart.sabbathschool.s3-website-us-west-2.amazonaws.com/api/",
    API_VERSION = "v1",
    SOURCE_DIR = "src/",
    SOURCE_INFO_FILE = "info.yml",
    SOURCE_COVER_FILE = "cover.png",
    SOURCE_EXTENSION = "md",
    DIST_DIR = "dist/api/" + API_VERSION + "/";

var create_languages_api = function(){
  /**
   * Creating languages API
   *
   * /api/v1/languages
   */
  var languages = [],
      _languages = fs.readdirSync(SOURCE_DIR)

  for (var i = 0; i < _languages.length; i++){
    if (!fs.lstatSync(SOURCE_DIR + _languages[i]).isDirectory()) continue;
    languages.push(yamljs.load(SOURCE_DIR + "/" + _languages[i] + "/" + SOURCE_INFO_FILE));
  }

  fswf(DIST_DIR + "/languages/index.json", JSON.stringify(languages));
  return languages;
};

var create_days_api = function(language, quarterly, lesson){
  /**
   * Create Days API
   */

  var WORKING_DIR = SOURCE_DIR + language + "/" + quarterly + "/" + lesson,
      days = [],
      _days = fs.readdirSync(WORKING_DIR);

  for (var i = 0; i < _days.length; i++){
    var extension = _days[i].split(".").pop(),
        _day = _days[i].replace("." + SOURCE_EXTENSION, "");
    if (extension != SOURCE_EXTENSION) continue;

    var _read = metaMarked(fs.readFileSync(WORKING_DIR + "/" + _days[i], "utf-8")),
        day = _read.meta,
        read = {};

    day.id = _day;
    day.index = language + "/" + quarterly + "/" + lesson + "/" + _day;
    day.path = language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day;
    day.full_path = API_HOST + API_VERSION + "/" + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day;
    day.read_path = language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day + "/read";
    day.full_read_path = API_HOST + API_VERSION + "/" + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day + "/read";

    read.content = _read.html;
    read.verses = [];

    fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day + "/index.json", JSON.stringify(day));
    fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day + "/read/index.json", JSON.stringify(read));
    //fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/" + _day + "/read/index.html", read.content);
    days.push(day);
  }

  fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/" + lesson + "/days/index.json", JSON.stringify(days));
  return days;
};

var create_lessons_api = function(language, quarterly){
  /**
   * Create Lessons API
   * language - @type {string}
   */

  var WORKING_DIR = SOURCE_DIR + language + "/" + quarterly,
      lessons = [],
      _lessons = fs.readdirSync(WORKING_DIR);

  for (var i = 0; i < _lessons.length; i++){
    if (!fs.lstatSync(WORKING_DIR + "/" + _lessons[i]).isDirectory()) continue;
    var lesson = {};
    lesson.lesson = yamljs.load(WORKING_DIR + "/" + _lessons[i] + "/" + SOURCE_INFO_FILE);
    lesson.lesson.id = _lessons[i];
    lesson.lesson.index = language + "/" + quarterly + "/" + _lessons[i];
    lesson.lesson.path = language + "/quarterlies/" + quarterly + "/lessons/" + _lessons[i];
    lesson.lesson.full_path = API_HOST + API_VERSION + "/" + language + "/quarterlies/" + quarterly + "/lessons/" + _lessons[i];
    lesson.days = create_days_api(language, quarterly, _lessons[i]);

    fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/" + _lessons[i] + "/index.json", JSON.stringify(lesson));
    lessons.push(lesson.lesson);
  }

  fswf(DIST_DIR + language + "/quarterlies/" + quarterly + "/lessons/index.json", JSON.stringify(lessons));
  return lessons;
};

var create_quarterlies_api = function(language){
  /**
   * Create Quarterlies API
   * @type {string} language code. Ex: 'en'
   */
  var WORKING_DIR = SOURCE_DIR + language,
      quarterlies = [],
      _quarterlies = fs.readdirSync(WORKING_DIR).reverse();

  for (var i = 0; i < _quarterlies.length; i++){
    if (!fs.lstatSync(WORKING_DIR + "/" + _quarterlies[i]).isDirectory()) continue;
    fs.copySync(WORKING_DIR + "/" + _quarterlies[i] + "/" + SOURCE_COVER_FILE, DIST_DIR + language + "/quarterlies/" + _quarterlies[i] + "/" + SOURCE_COVER_FILE);

    var quarterly = {};
    quarterly.quarterly = yamljs.load(WORKING_DIR + "/" + _quarterlies[i] + "/" + SOURCE_INFO_FILE);
    quarterly.quarterly.lang = language;
    quarterly.quarterly.id = _quarterlies[i];
    quarterly.quarterly.index = language + "/" + _quarterlies[i];
    quarterly.quarterly.path = language + "/quarterlies/" + _quarterlies[i];
    quarterly.quarterly.full_path = API_HOST + API_VERSION + "/" + language + "/quarterlies/" + _quarterlies[i];
    quarterly.quarterly.cover = API_HOST + API_VERSION + "/" + quarterly.quarterly.path + "/" + SOURCE_COVER_FILE;

    quarterly.lessons = create_lessons_api(language, _quarterlies[i]);

    fswf(DIST_DIR + language + "/quarterlies/" + _quarterlies[i] + "/index.json", JSON.stringify(quarterly));
    quarterlies.push(quarterly.quarterly);
  }

  fswf(DIST_DIR + language + "/quarterlies/index.json", JSON.stringify(quarterlies));
  return quarterlies;
};

var languages = create_languages_api();

for (var i = 0; i < languages.length; i++){
  create_quarterlies_api(languages[i].code);
}