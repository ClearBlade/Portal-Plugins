freeboard.addStyle('.gm-style-cc a', "text-shadow:none;");

function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    var rtnWidth = srcWidth * ratio;
    var rtnHeight = srcHeight * ratio;
    return { width: rtnWidth, height: rtnHeight };
}

var iFloorPlanWidget = function(settings, updateCallback) {
    var self = this;
    var currentSettings = settings;
    var sizeInBlocks = settings.sizeInBlocks;
    var dataPoints;
    var stage, output;
    var SCALE;
    var blockUpdates = false;

    var loop_handle = setTimeout(resizeCanvas, '2000'); //Hack to ensure the image resizes to fill the space.
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        if (stage !== undefined) {
            stage.enableMouseOver(5); //Required for enabling mouseover events
            stage.clear();
            var bgImg = document.createElement("img");
            stage.canvas.width = stage.canvas.parentElement.clientWidth;
            stage.canvas.height = stage.canvas.parentElement.clientHeight;
            bgImg.src = currentSettings.floorPlan_URL;
            bgImg.onload = function() {
                var bg = new createjs.Bitmap(bgImg);
                var backgroundImageSize = calculateAspectRatioFit(bgImg.width, bgImg.height, stage.canvas.width, stage.canvas.height);
                SCALE = backgroundImageSize.width / bgImg.width;
                bg.scaleX = SCALE;
                bg.scaleY = SCALE;
                stage.removeAllChildren();
                stage.addChild(bg);
                stage.update();
                plotData();
            }
        }
    }

    self.getValue = function() {
        return currentSettings;
    }

    self.onEvent = function() {
        updateCallback(currentSettings);
    }

    self.calculateAspectRatioFit = function(srcWidth, srcHeight, maxWidth, maxHeight) {
        var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        var rtnWidth = srcWidth * ratio;
        var rtnHeight = srcHeight * ratio;
        return { width: rtnWidth, height: rtnHeight };
    }

    self.render = function(element) {
        //Draw the base canvas
        if ((typeof(createjs) !== undefined) && (stage == undefined)) {
            var canvas = document.createElement("canvas");
            element.appendChild(canvas);
            stage = new createjs.Stage(canvas);
            stage.canvas.style = currentSettings.floorPlan_canvas_style;
        }
        resizeCanvas();
    }

    function plotData() {
        while (stage.children.length > 1) {
            stage.removeChild(stage.children[stage.children.length - 1]);
            stage.update();
        }
        if (dataPoints !== undefined) {
            for (i = 0; i < dataPoints.length; i++) {
                drawIcon(dataPoints[i][currentSettings.device_name_display_property], dataPoints[i].x * SCALE, dataPoints[i].y * SCALE, dataPoints[i].properties);
            }
        }
    }

    function drawIcon(name, x, y, textObj) {
        var valueText;
        var deviceName;
        var boxheight = currentSettings.databoxHeight;
        var boxwidth = currentSettings.databoxWidth;
        stage.mouseMoveOutside = false;
        if (isNaN(x))
            x = 20;
        if (isNaN(y))
            y = 20;
        var data_container = new createjs.Container();
        for (var i = 0; i < textObj.length; i++) {
            var shape = new createjs.Shape();
            var dataPointContainer = new createjs.Container();
            shape.graphics.beginFill(textObj[i].backgroundColor).drawRect(0, 0, boxwidth, boxheight);
            valueText = new createjs.Text(textObj[i].name.charAt(0) + ": " + textObj[i].value, currentSettings.display_Text_CSS, currentSettings.primary_display_textcolor);
            valueText.textAlign = "center";
            valueText.textBaseline = "middle";
            valueText.x = boxwidth - boxwidth / 2;
            valueText.y = boxheight - boxheight / 2;
            dataPointContainer.addChild(shape, valueText);
            dataPointContainer.y = boxheight * i;
            data_container.addChild(dataPointContainer);
        }

        deviceName = new createjs.Text(name, currentSettings.display_Text_CSS, currentSettings.primary_display_textcolor);
        deviceName.textAlign = "center";
        deviceName.visible = currentSettings.displaySensorName;
        deviceName.x = boxwidth - boxwidth / 2;
        deviceName.y = -15;
        data_container.addChild(deviceName);

        data_container.name = name;
        data_container.x = x;
        data_container.y = y;

        stage.addChild(data_container);
        if (currentSettings.allowSensorLocationUpdates) {
            data_container.on("pressmove", function(evt) {
                blockUpdates = true; //Block updating the view (causes a redraw)
                evt.currentTarget.x = evt.stageX;
                evt.currentTarget.y = evt.stageY;
                this.children[(this.children.length - 1)].visible = true;
                stage.update();
            });

            data_container.on("pressup", function(evt) {
                blockUpdates = false;
                evt.currentTarget.x = evt.stageX;
                evt.currentTarget.y = evt.stageY;
                this.children[(this.children.length - 1)].visible = currentSettings.displaySensorName;
                stage.update();
                if (currentSettings.updateSensorXY[0].dsName != "")
                    freeboard.getDatasource(currentSettings.updateSensorXY[0].dsName).sendData({ "name": this.name, "x": evt.currentTarget.x / SCALE, "y": evt.currentTarget.y / SCALE });
            });
        }

        data_container.on("mouseover", function(evt) {
            this.children[(this.children.length - 1)].visible = true;
            stage.update();
        });
        data_container.on("mouseout", function(evt) {
            this.children[(this.children.length - 1)].visible = currentSettings.displaySensorName;
            stage.update();
        });


        stage.update();
    }

    self.onSettingsChanged = function(newSettings) {
        sizeInBlocks = utils.widget.calculateHeight(newSettings.sizeInBlocks);
        if (currentSettings._datatype == "static") {
            dataPoints = JSON.parse(currentSettings.floorPlan_data);
        }
        currentSettings = newSettings;
    }

    self.onCalculatedValueChanged = function(settingName, newValue) {
        if ((settingName == "floorPlan_data") && (currentSettings._datatype !== "static")) {
            if (newValue.hasOwnProperty("results")) {
                dataPoints = newValue.results;
            } else {
                dataPoints = newValue;
            }
            //Don't update if we are dragging
            if (!blockUpdates)
                plotData();
        }
    }

    self.onDispose = function() {}

    self.getHeight = function() {
        return utils.widget.calculateHeight(sizeInBlocks);
    }

    self.getWidth = function() {
            return utils.widget.calculateHeight(sizeInBlocks);
        }
        //this.initializeFloorPlan();
    this.onSettingsChanged(settings);
};

freeboard.loadWidgetPlugin({
    type_name: "floor_plan_widget3",
    display_name: "ClearBlade Visual Data Map v3",
    external_scripts: ["//code.createjs.com/easeljs-0.8.2.min.js"],
    fill_size: true,
    settings: [{
        name: "floor_Plan_Name",
        display_name: "Floor Plan Name",
        type: "text",
        required: true
    }, {
        name: "floorPlan_canvas_style",
        display_name: "Canvas Style",
        type: "text",
        default_value: "border:1px solid #d3d3d3;padding-left: 0; padding-right: 0;margin-left: auto;margin-right: auto;display: block;",
        description: "Default to put border and center canvas in window (horizontally): border:1px solid #d3d3d3;padding-left: 0; padding-right: 0;margin-left: auto;margin-right: auto;display: block;"
    }, {
        name: "floorPlan_URL",
        display_name: "Floor Plan URL",
        default_value: "https://s3.amazonaws.com/uploads.hipchat.com/76688/547710/TCJQkTH3rsQQBkD/7408d6e1d8a63395e71cce4d58a19576.jpg",
        type: "text"
    }, {
        name: "display_Text_CSS",
        display_name: "Text CSS",
        default_value: "bold 12px Verdana",
        type: "text"
    }, {
        name: "databoxHeight",
        display_name: "Databox Height",
        default_value: "15",
        type: "integer"
    }, {
        name: "databoxWidth",
        display_name: "Databox Width",
        default_value: "60",
        type: "integer"
    }, {
        name: "display_Text_CSS",
        display_name: "Text CSS",
        default_value: "bold 12px Verdana",
        type: "text"
    }, {
        name: "floorPlan_data",
        display_name: "Floor Plan Data Source",
        description: '[{"device_name":"RC_01","display_name":"Regular Sensor","properties":[{"backgroundColor":"#D7FF33","name":"temperature","value":19.5},{"backgroundColor":"D7FF33","name":"humidity","value":50},{"backgroundColor":"D7FF33","name":"light","value":555},{"backgroundColor":"D7FF33","name":"motion","value":false},{"backgroundColor":"D7FF33","name":"vdd","value":3600}],"x":117.46922302246094,"y":77.2723388671875},{"device_name":"RC_02","display_name":"Super Sensor","properties":[{"backgroundColor":"#33FF4F","name":"temperature","value":0},{"backgroundColor":"D7FF33","name":"humidity","value":20},{"backgroundColor":"D7FF33","name":"light","value":550},{"backgroundColor":"D7FF33","name":"motion","value":false},{"backgroundColor":"D7FF33","name":"vdd","value":3000}],"x":173.24786376953125,"y":132.06240844726562}]',
        type: "data",
        multi_input: true,
        incoming_parser: true,
        outgoing_parser: false,
        default_value: '[{"name": "mySensorName" "x":50, "y":50}]'
    }, {
        name: "updateSensorXY",
        display_name: "Sensor Coordinates Update",
        description: 'Sample Response for doing an update: {"name": "mySensorName", "x":110,"y":75',
        type: "data",
        force_data: "dynamic",
        multi_input: false,
        incoming_parser: false,
        outgoing_parser: true
    }, {
        name: "allowSensorLocationUpdates",
        display_name: "Allow Sensor Location Updates",
        type: "boolean",
        force_data: "static",
        multi_input: false,
        incoming_parser: false,
        outgoing_parser: false
    }, {
        name: "displaySensorName",
        display_name: "Display Sensor Name",
        type: "boolean",
        force_data: "static",
        multi_input: false,
        incoming_parser: false,
        outgoing_parser: false
    }, {
        name: "device_name_display_property",
        display_name: "Primary Device Name Display Property",
        description: "Property for display name from data payload",
        type: "text",
        default_value: "name"
    }, {
        name: "sizeInBlocks",
        display_name: "Size in Blocks",
        description: "Blocks are 60px, fractions are not allowed. eg: 1.5 will be cast to 2",
        type: "number",
        default_value: 4
    }, {
        name: "container_width",
        display_name: "Container width",
        type: "integer",
        description: "Width of your widget's container as a percentage. Useful when juxtaposing widgets.",
        default_value: "100",
        required: true
    }],
    newInstance: function(settings, newInstanceCallback) {
        newInstanceCallback(new iFloorPlanWidget(settings));
    }
});
