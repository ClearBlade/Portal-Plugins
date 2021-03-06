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
    var url = "";
    var stage;
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
            bgImg.src = url;
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
            //stage.removeChild(stage.children[stage.children.length - 1]);
            stage.removeChildAt(stage.children.length - 1);
            stage.update();
        }
        if (dataPoints !== undefined) {
            for (i = 0; i < dataPoints.length; i++) {
                //drawIcon(dataPoints[i][currentSettings.device_name_display_property], dataPoints[i].x * SCALE, dataPoints[i].y * SCALE, dataPoints[i].properties);
                drawIcon(dataPoints[i]);
            }
        }
    }

    //function drawIcon(dataPoints) {
    function drawIcon(dataPoint) {
        var valueText;
        var deviceName;
        var boxheight = currentSettings.databoxHeight;
        var boxwidth = currentSettings.databoxWidth;
        stage.mouseMoveOutside = false;
        
        //Set default coordinates and datapoint background color
        if (isNaN(dataPoint.x))
            dataPoint.x = 20;
        if (isNaN(dataPoint.y))
            dataPoint.y = 20;
        if (!dataPoint.backgroundColor)
            dataPoint.backgroundColor = currentSettings.primary_display_textcolor;
        
        //Create the container that will hold all of the canvas elements related to a datapoint
        var device_container = new createjs.Container();

        //If sensor icons are to be displayed, create the sensor icon and
        //add it to the container
        if(currentSettings.displaySensorIcon) {
            var sensorIcon = new createjs.Shape();
            sensorIcon.graphics.beginFill(dataPoint.backgroundColor).drawCircle(0, 0, 5);
            device_container.addChild(sensorIcon);
        }

        var device_data_container = new createjs.Container();
        device_data_container.visible = currentSettings.displaySensorName;

        //Create a container to house the deviceName and its bounding rectangle
        var nameContainer = new createjs.Container();
        //nameContainer.x = 10;
        //nameContainer.y = -25;
        
        //Create the bounding rectangle for the device name
        var nameRect = new createjs.Shape();
        nameRect.graphics.beginFill("#aad8f7").drawRect(15, 0, boxwidth, boxheight);

        //Create the text element to hold the device name
        deviceName = new createjs.Text(dataPoint[currentSettings.device_name_display_property], 
            currentSettings.display_Text_CSS, currentSettings.primary_display_textcolor);
        deviceName.textAlign = "left";
        deviceName.textBaseline = "middle";
        deviceName.x = 20;
        deviceName.y = boxheight - boxheight / 2;

        //Add the name
        nameContainer.addChild(nameRect, deviceName);

        //Add the name container to the device data container
        device_data_container.addChild(nameContainer);

        //Loop through each datapoint property
        for (var i = 0; i < dataPoint.properties.length; i++) {
            var dataPointContainer = new createjs.Container();

            //Create a rectangle in which to display the datapoint property
            var shape = new createjs.Shape();
            shape.graphics.beginFill(dataPoint.properties[i].backgroundColor).drawRect(15, 0, boxwidth, boxheight);

            //Create a text element to hold the property value
            valueText = new createjs.Text(dataPoint.properties[i].name + ": " + 
                dataPoint.properties[i].value, currentSettings.display_Text_CSS, currentSettings.primary_display_textcolor);
            valueText.textAlign = "center";
            valueText.textBaseline = "middle";
            valueText.x = boxwidth - boxwidth / 2;
            valueText.y = boxheight - boxheight / 2;

            //Add the value rectangle and the text to the datapoint container
            dataPointContainer.addChild(shape, valueText);
            dataPointContainer.y = boxheight * (i+1);

            //Add the data point container to the 
            device_data_container.addChild(dataPointContainer);
        }

        //Add code to make sure the popup will fit on the canvas
        var deviceX = dataPoint.x * SCALE;
        var deviceY = dataPoint.y * SCALE;

        //If x is too far right, display the content on the left of the icon
        if(stage.canvas.width - deviceX < boxwidth) {
            device_data_container.x = - boxwidth - 25;
        }

        //If y is too far down, display the content above the icon
        if(stage.canvas.height - deviceY < (dataPoint.properties.length + 1) * boxheight) {
            device_data_container.y = -(dataPoint.properties.length + 1) * boxheight;
        }

        device_container.addChild(device_data_container);
        device_container.name = dataPoint[[currentSettings.device_name_display_property]];

        device_container.x = deviceX;
        device_container.y = deviceY;

        stage.addChild(device_container);

        //Code to allow sensor locations to be dragged/dropped
        if (currentSettings.allowSensorLocationUpdates) {
            device_data_container.on("pressmove", function(evt) {
                blockUpdates = true; //Block updating the view (causes a redraw)
                evt.currentTarget.x = evt.stageX;
                evt.currentTarget.y = evt.stageY;
                this.children[(this.children.length - 1)].visible = true;
                stage.update();
            });

            device_data_container.on("pressup", function(evt) {
                blockUpdates = false;
                evt.currentTarget.x = evt.stageX;
                evt.currentTarget.y = evt.stageY;
                this.children[(this.children.length - 1)].visible = currentSettings.displaySensorName;
                stage.update();
                if (currentSettings.updateSensorXY[0].dsName != "")
                    freeboard.getDatasource(currentSettings.updateSensorXY[0].dsName).sendData({ "name": this.name, "x": evt.currentTarget.x / SCALE, "y": evt.currentTarget.y / SCALE });
            });
        }

        device_container.on("mouseover", function(evt) {
            this.children[(this.children.length - 1)].visible = true;
            stage.setChildIndex(this, stage.children.length -1);
            stage.update();
        });
        device_container.on("mouseout", function(evt) {
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
        if(currentSettings._datatype !== "static") {
            if ((settingName == "floorPlan_data") && (currentSettings._datatype !== "static")) {
                if (newValue.hasOwnProperty("results")) {
                    dataPoints = newValue.results;
                } else {
                    dataPoints = newValue;
                }
                //Don't update if we are dragging
                if (!blockUpdates) {
                    plotData();
                }
            } else {
                if ((settingName == "floorPlan_URL") && (currentSettings._datatype !== "static")) {
                    if(newValue !== null) {
                        url = newValue;
                    } else {
                        url = "";
                    }
                    resizeCanvas();
                }
            }
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
        name: "display_Text_CSS",
        display_name: "Text CSS",
        default_value: "bold 12px Verdana",
        type: "text"
    }, {
        name: "primary_display_textcolor",
        display_name: "Text Color",
        description: "ex. black, #000, rgb(0,0,0), etc.",
        default_value: "black",
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
        name: "floorPlan_data",
        display_name: "Floor Plan Data Source",
        description: '[{"device_name":"RC_01","display_name":"Regular Sensor","properties":[{"backgroundColor":"#D7FF33","name":"temperature","value":19.5},{"backgroundColor":"D7FF33","name":"humidity","value":50},{"backgroundColor":"D7FF33","name":"light","value":555},{"backgroundColor":"D7FF33","name":"motion","value":false},{"backgroundColor":"D7FF33","name":"vdd","value":3600}],"x":117.46922302246094,"y":77.2723388671875},{"device_name":"RC_02","display_name":"Super Sensor","properties":[{"backgroundColor":"#33FF4F","name":"temperature","value":0},{"backgroundColor":"D7FF33","name":"humidity","value":20},{"backgroundColor":"D7FF33","name":"light","value":550},{"backgroundColor":"D7FF33","name":"motion","value":false},{"backgroundColor":"D7FF33","name":"vdd","value":3000}],"x":173.24786376953125,"y":132.06240844726562}]',
        type: "data",
        multi_input: true,
        incoming_parser: true,
        outgoing_parser: false,
        default_value: '[{"name": "mySensorName" "x":50, "y":50}]'
    }, {
        name: "floorPlan_URL",
        display_name: "Floor Plan URL",
        description: "https://yourhost/yourpath/your_floorplan.jpg",
        type: "data",
        multi_input: false,
        incoming_parser: true,
        outgoing_parser: false
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
        name: "displaySensorIcon",
        display_name: "Display Sensor Icon",
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
