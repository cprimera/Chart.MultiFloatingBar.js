/*
 * Chart.MultiFloatingBar.js
 * Version: 0.1.0-beta.0
 *
 * Copyright 2014 Christopher Primerano
 * Released under the MIT license
 * https://github.com/cprimera/Chart.MultiFloatingBar.js/blob/master/LICENSE
 */

(function () {

	/* global Chart */
	var helpers = Chart.helpers;

	var defaultConfig = {
		//String - A legend template
		legendTemplate : '<ul class="<%=name.toLowerCase()%>-legend"><% for (var i=0; i<datasets.length; i++){%><li><span style="background-color:<%=datasets[i].fillColor%>"><%if(datasets[i].label){%><%=datasets[i].label%><%}%></span></li><%}%></ul>'
	};

	Chart.types.Bar.extend({
		
		name: 'MultiFloatingBar',
		defaults : defaultConfig,
		initialize:  function(data){

			var options = this.options;

			this.ScaleClass = Chart.Scale.extend({
				offsetGridLines: true,
				calculateBarX: function (barIndex) {
					return this.calculateX(barIndex);
				},
				calculateBaseWidth: function () {
					return (this.calculateX(1) - this.calculateX(0)) - (2 * options.barValueSpacing);
				},
				calculateBarWidth: function (datasetCount) {
					return this.calculateBaseWidth();
				}
			});

			if (this.options.showTooltips){
				helpers.bindEvents(this, this.options.tooltipEvents, function(e){
					var toolTipBars = (e.type !== 'mouseout') ? this.getBarsAtEvent(e) : [];

					this.eachBars(function (bar) {
						bar.restore(['fillColor', 'strokeColor']);
					});

					helpers.each(toolTipBars, function(toolTipBar){
						toolTipBar.fillColor = toolTipBar.highlightFill;
						toolTipBar.strokeColor = toolTipBar.highlightStroke;
					});
					this.showTooltip(toolTipBars);
				});
			}

			this.datasets = [];

			this.BarClass = Chart.Rectangle.extend({
				strokeWidth: this.options.barStrokeWidth,
				showStroke: this.options.barShowStroke,
				ctx: this.chart.ctx
			});

			helpers.each(data.datasets, function (dataset, datasetIndex) {
				var datasetObject = {
					label: dataset.label || null,
					fillColor: dataset.fillColor,
					strokeColor: dataset.strokeColor,
					bars: []
				};

				this.datasets.push(datasetObject);

				helpers.each(dataset.data, function (dataPoint, dataPointIndex) {
					var bar = new this.BarClass({
						startValue: dataPoint.start,
						endValue: dataPoint.end,
						value: dataPoint.start,
						label: data.labels[dataPointIndex],
						datasetLabel: dataset.label,
						fillColor: dataset.fillColor,
						strokeColor: dataset.strokeColor,
						highlightFill: dataset.highlightFill || dataset.fillColor,
						highlightStroke: dataset.highlightStroke || dataset.strokeColor
					});

					datasetObject.bars.push(bar);

				}, this);

			}, this);

			this.buildScale(data.labels);


			this.eachBars(function (bar, barIndex) {
				helpers.extend(bar, {
					base: this.scale.endPoint,
					x: this.scale.calculateBarX(barIndex),
					y: this.scale.endPoint,
					width: this.scale.calculateBarWidth(this.datasets.length)
				});
				bar.save();
			}, this);

			this.render();
			
		},
		buildScale: function (labels) {

			var self = this;

			var dataTotal = function () {
				var values = [];

				self.eachBars(function (bar, barIndex) {
					if (!values[barIndex]) {
						values[barIndex] = 0;
					}

					values[barIndex] = (values[barIndex] < bar.startValue) ? bar.startValue : values[barIndex];
				});

				return values;
			};

			var scaleOptions = {
				templateString : this.options.scaleLabel,
				height : this.chart.height,
				width : this.chart.width,
				ctx : this.chart.ctx,
				textColor : this.options.scaleFontColor,
				fontSize : this.options.scaleFontSize,
				fontStyle : this.options.scaleFontStyle,
				fontFamily : this.options.scaleFontFamily,
				valuesCount : labels.length,
				beginAtZero : this.options.scaleBeginAtZero,
				integersOnly : this.options.scaleIntegersOnly,
				calculateYRange: function(currentHeight){
					var updatedRanges = helpers.calculateScaleRange(
						dataTotal(),
						currentHeight,
						this.fontSize,
						this.beginAtZero,
						this.integersOnly
					);
					helpers.extend(this, updatedRanges);
				},
				xLabels : this.options.xLabels || labels,
				font : helpers.fontString(this.options.scaleFontSize, this.options.scaleFontStyle, this.options.scaleFontFamily),
				lineWidth : this.options.scaleLineWidth,
				lineColor : this.options.scaleLineColor,
				gridLineWidth : (this.options.scaleShowGridLines) ? this.options.scaleGridLineWidth : 0,
				gridLineColor : (this.options.scaleShowGridLines) ? this.options.scaleGridLineColor : 'rgba(0,0,0,0)',
				padding : (this.options.showScale) ? 0 : (this.options.barShowStroke) ? this.options.barStrokeWidth : 0,
				showLabels : this.options.scaleShowLabels,
				display : this.options.showScale
			};

			if (this.options.scaleOverride){
				helpers.extend(scaleOptions, {
					calculateYRange: helpers.noop,
					steps: this.options.scaleSteps,
					stepValue: this.options.scaleStepWidth,
					min: this.options.scaleStartValue,
					max: this.options.scaleStartValue + (this.options.scaleSteps * this.options.scaleStepWidth)
				});
			}

			this.scale = new this.ScaleClass(scaleOptions);
		},
		update: function () {
			this.scale.update();

			helpers.each(this.activeElements, function (activeElement, elementIndex) {
				activeElement.restore(['fillColor', 'strokeColor']);
			});

			this.eachBars(function (bar) {
				bar.save();
			});

			this.render();
		},
		reflow: function () {
			helpers.extend(this.BarClass.prototype, {
				y: this.scale.endPoint,
				base: this.scale.endPoint
			});

			var newScaleProps = helpers.extend({
				height: this.chart.height,
				width: this.chart.width
			});

			this.scale.update(newScaleProps);
		},
		draw: function(ease) {
			ease = ease || 1;

			this.clear();

			this.scale.draw(ease);

			this.eachBars(function (bar, barIndex) {
				if (bar.startValue !== bar.endValue) {
					bar.transition({
						base: this.scale.calculateY(bar.startValue),
						x: this.scale.calculateX(barIndex),
						y: this.scale.calculateY(bar.endValue),
						width: this.scale.calculateBarWidth(this.datasets.length)
					}, ease).draw();
				}
			}, this);
		}
	});
}).call(this);