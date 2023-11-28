var fileNumber = 0;
var MAXLOGS = 9;
var logRawData = false;
var recording = false; // New variable to track recording state
var recordingInterval;
var recordingWidget;

function createRecordingWidget() {
  recordingWidget = {
    width: 12, // Adjust the width as needed
    draw: function() {
      g.reset();
      g.drawImage(recording ? require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/")) : require("heatshrink").decompress(atob("i0WwH+H4fz4A/AiD/AjD/AiH+AiH+AjD/AjD/AjD/AiD/")), this.x, this.y);
    }
  };
  WIDGETS["recording"] = recordingWidget;
}
//setInterval(createRecordingWidget,1000);

// Declare accelHandler in the global scope
function accelHandler(accel) {
  // ... (unchanged code for handling accelerometer data)
}
//setInterval(accelHandler,1000);
function getFileName(n) {
  return "accellog."+n+".csv";
}
//setInterval(getFileName,1000);
function showMenu() {
  var menu = {
    "" : { title : "Accel Logger" },
    /*LANG*/"< Back": () => Bangle.showLauncher(),
    "File No" : {
      value : fileNumber,
      min : 0,
      max : MAXLOGS,
      onchange : v => { fileNumber=v; }
    },
    "Start" : function() {
      toggleRecord();
    },
    "View Logs" : function() {
      viewLogs();
    },
    "Log raw data" : {
      value : !!logRawData,
      onchange : v => { logRawData=v; }
    },
    "Stop" : function() {
      stopRecord();
    },
  };
  E.showMenu(menu);
}
//setInterval(showMenu,1000);
function stopRecord() {
    recording = false;
    Bangle.removeListener('accel', accelHandler);
    clearInterval(recordingInterval);
    E.showMessage("stopping...");
    showMenu(); // Go back to the main menu after stopping recording
    if (recordingWidget) {
      delete WIDGETS["recording"];
      recordingWidget = undefined;
    }
}
//setInterval(stopRecord,1000);
function viewLog(n) {
  E.showMessage("Loading...");
  var f = require("Storage").open(getFileName(n), "r");
  var records = 0, l = "", ll="";
  while ((l=f.readLine())!==undefined) {records++;ll=l;}
  var length = 0;
  if (ll) length = Math.round( (ll.split(",")[0]|0)/1000 );

  var menu = {
    "" : { title : "Log "+n },
    "< Back" : () => { viewLogs(); },
    "Back to Menu" : () => { showMenu(); },
  };
  menu[records+" Records"] = "";
  menu[length+" Seconds"] = "";
  menu["DELETE"] = function() {
    E.showPrompt("Delete Log "+n).then(ok=>{
      if (ok) {
        E.showMessage("Erasing...");
        var f = require("Storage").open(getFileName(n), "r");
        f.erase();
        viewLogs();
      } else viewLog(n);
    });
  };

  E.showMenu(menu);
}
//setInterval(viewLog,1000);
function viewLogs() {
  var menu = {
    "" : { title : "Logs" },
    "< Back" : () => { showMenu(); }
  };

  var hadLogs = false;
  for (var i=0;i<=MAXLOGS;i++) {
    var f = require("Storage").open(getFileName(i), "r");
    if (f.readLine()!==undefined) {
      (function(i) {
        menu["Log "+i] = () => viewLog(i);
      })(i);
      hadLogs = true;
    }
  }
  if (!hadLogs)
    menu["No Logs Found"] = function(){};
  E.showMenu(menu);
}
//setInterval(viewLogs,1000);
function toggleRecord() {
  if (recording) {
    stopRecord();
  } else {
    startRecord();
    E.showMessage("starting...");
    showMenu();
  }
}
//setInterval(toggleRecord,1000);
function startRecord(force) {
  createRecordingWidget();
  if (recording && !force) return; // Avoid starting a new recording while one is already in progress

  // Set up recording logic
  var start = getTime();
  var sampleCount = 0;

  // Open the file in write mode ("w") to clear existing content
  var f = require("Storage").open(getFileName(fileNumber), "w");
  f.write("Time (ms),X,Y,Z,Total\n");


  function accelHandler(accel) {
    if (recording) {
      var t = getTime() - start;

      // Write accelerometer data to file
      if (logRawData) {
        f.write([
          t * 1000,
          accel.x * 8192,
          accel.y * 8192,
          accel.z * 8192,
          accel.mag * 8192,
        ].map(n => Math.round(n)).join(",") + "\n");
      } else {
        f.write([
          Math.round(t * 1000),
          accel.x,
          accel.y,
          accel.z,
          accel.mag,
        ].join(",") + "\n");
      }

      sampleCount++;
    }
  }

  Bangle.setPollInterval(1000);
  Bangle.on('accel', accelHandler);
  recording = true; // Update recording state

  // Start a background interval to keep recording (adjust interval as needed)
  recordingInterval = setInterval(() => {
    // Do nothing, just keep the recording going
  }, 1000);
}
Bangle.setAppOptions({
stopOnButtonLong: false;
closeOnDeepSleep: false;
//setInterval(startRecord,1000);
Bangle.loadWidgets();
Bangle.drawWidgets();
showMenu();
