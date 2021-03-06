const trimer = new RegExp('(^[\\s\\t\\xa0\\u3000]+)|([\\u3000\\xa0\\s\\t]+\x24)', 'g');
var technologyData = {};

function parseHeader(raw) {
  var headers = new Array();
  var lines = raw.split("\r\n");
  for (var l in lines){
    if (lines[l].indexOf(":") != -1){
      var split = lines[l].indexOf(":");
      var key   = lines[l].substring(0, split).toLowerCase();
      var value = lines[l].substring(split + 1);
      headers[key] = value.replace(trimer, '');
    }
  }
  return headers;
}

function matchRule(data, rules) {
  for (var i = 0; i < rules.length; i++) {
    if (data[rules[i].match.toLowerCase()]) {
      var result = data[rules[i].match.toLowerCase()].match(rules[i].regex);
      // console.log(result);
      if (result){
        rules[i]['result'] = result;
        return rules[i];
      }
    }
  }
  return {
    title : "Unknown",
    icon  : "unrecognized_technology.png"
  };
}

function findNode(root, type, text, name, attr){
  // type = [
  //  1, // element 
  //  3, // text
  //  8  // comment
  // ]
  // text = reg to search
  // name = element tagName
  // attr = element attr to search

  for (var node in root){
    if(type == 1 && root[node].nodeType == type){ // element
      if (root[node].nodeName.toUpperCase() == name.toUpperCase()){
        var search_str = root[node].attributes[attr.toLowerCase()];
        if (search_str.match(text)){
          return true;
        }
      }
    }else if(root[node].nodeType == type){ // text & comment
      if (root[node].nodeValue.match(text)) {
        return true;
      }
    }
  }
  return false;
}

chrome.extension.onMessage.addListener(function(data, sender) {
  technologyData[sender.tab.id] = parseHeader(data.header);
  technologyData[sender.tab.id]['raw_header'] = data.header;
  technologyData[sender.tab.id]['hostname'] = data.hostname;
  var root = data.dom;

  if(data.hostname != null){
    // get server ip informations.
    var xhr = new XMLHttpRequest();
    var request_url = "http://api.ipinfodb.com/v2/ip_query.php?key=5eb5b4de91741e2e4b98748989dc84f3236b55f6dd38aa689921884867536f36&ip=" + data.hostname + "&output=json&timezone=false"
    xhr.open("GET", request_url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var resp = JSON.parse(xhr.responseText);
        console.log(resp);
        technologyData[sender.tab.id]['ip_info'] = resp;
      }
    }
    xhr.send();
  }

  var alt = "Unknown technology";
  var ico = "unrecognized_technology.png";
  var show_icon = localStorage["icon"];

  // match web technologies
  var technology = matchRule(technologyData[sender.tab.id], web_technologies);
  technologyData[sender.tab.id]['technology'] = technology;

  // match web server
  var webserver = matchRule(technologyData[sender.tab.id], web_servers);
  technologyData[sender.tab.id]['webserver'] = webserver;

  // match os
  var os = matchRule(technologyData[sender.tab.id], oses);
  technologyData[sender.tab.id]['os'] = os;

  // match web front libraries
  var front_libraries = []
  for (var i in web_front_libraries) {
    for (var j in web_front_libraries[i]['rules']) {
      if (findNode(root, web_front_libraries[i]['rules'][j].type, web_front_libraries[i]['rules'][j].match, web_front_libraries[i]['rules'][j].name, web_front_libraries[i]['rules'][j].attributes)) {
        front_libraries.push(web_front_libraries[i]);
        break;
      }
    }
  }
  technologyData[sender.tab.id]['front_libraries'] = front_libraries;

  // match web apps
  var apps = []
  for (var i in web_apps) {
    for (var j in web_apps[i]['rules']) {
      if (findNode(root, web_apps[i]['rules'][j].type, web_apps[i]['rules'][j].match, web_apps[i]['rules'][j].name, web_apps[i]['rules'][j].attributes)) {
        apps.push(web_apps[i]);
        break;
      }
    }
  }
  technologyData[sender.tab.id]['web_apps'] = apps;

  // choose pageAction icon
  switch (show_icon) {
      case "webserver":
        alt = webserver.title;
        ico = webserver.icon;
        break;
      case "technology":
        alt = technology.title;
        ico = technology.icon;
        break;
      case "os":
        alt = os.title;
        ico = os.icon;
        break;
      case "webapp":
        if (apps[0]) {
          alt = apps[0].title;
          ico = apps[0].icon;
        }
        break;
      default:
        alt = webserver.title;
        ico = webserver.icon;
        break;
  }

  chrome.pageAction.setIcon({
    tabId: sender.tab.id, 
    path: "icons/" + ico
  });
  chrome.pageAction.setTitle({
    tabId: sender.tab.id, 
    title: alt
  });
  chrome.pageAction.show(sender.tab.id);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete technologyData[tabId];
});
