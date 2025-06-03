

class Controls {
	static move(controls) {
		function mousePressed(e) {
			controls.viewPos.isDragging = true;
			controls.viewPos.prevX = e.clientX;
			controls.viewPos.prevY = e.clientY;
		}
		function mouseDragged(e) {
			const { prevX, prevY, isDragging } = controls.viewPos;
			if (!isDragging) return;
			const pos = { x: e.clientX, y: e.clientY };
			const dx = pos.x - prevX;
			const dy = pos.y - prevY;
			if (prevX || prevY) {
				controls.view.x += dx;
				controls.view.y += dy;
				controls.viewPos.prevX = pos.x, controls.viewPos.prevY = pos.y;
				controls.display.render();
			}
		}
		function mouseReleased(e) {
			controls.viewPos.isDragging = false;
			controls.viewPos.prevX = null;
			controls.viewPos.prevY = null;
			controls.display.render();
		}
		return {
			mousePressed,
			mouseDragged,
			mouseReleased
		};
	}
	static zoom(controls) {
		function worldZoom(e) {
			e.preventDefault();
			let last_zoom = controls.view.zoom;
			const { x, y, deltaY } = e;
			const direction = deltaY > 0 ? -1 : 1;
			const factor = controls.view.SCROLL_SENSITIVITY;
			const zoom = 1 * direction * factor;
			const wx = (x - controls.view.x) / (controls.view.width * controls.view.zoom);
			const wy = (y - controls.view.y) / (controls.view.height * controls.view.zoom);

			controls.view.zoom += zoom;
			controls.view.zoom = Math.min(controls.view.zoom, controls.view.MAX_ZOOM);
			controls.view.zoom = Math.max(controls.view.zoom, controls.view.MIN_ZOOM);

			if (controls.view.zoom !== last_zoom) {
				controls.view.x -= wx * controls.view.width * zoom;
				controls.view.y -= wy * controls.view.height * zoom;
			}
			controls.display.render();
		}
		return { worldZoom };
	}
}

const HEADER_HEIGHT = 30;

TournamentBracket = class {
	constructor(canvas_id, settings) {
		var ds = {
			debug: false,
			phase_header: true,
			data_url: '',
			data_refresh_time: 10000,
			width: 200,
			height: 90,
			v_spacing: 10,
			h_spacing: 10,
			background_color: "#EDEDED",
			border_color: "#000000",
			border_width: "1",
			bracket_color: "#000000",
			bracket_width: "2",
			round_text_color: '#FF0000',
			text_color: "#000000",
			text_color_loss: "#999999",
			text_color_game: "#FFFFFF",
			text_style: "italic 18px verdana",
			gradient: false,
			logo: { active: false, height: 30, width: 30, default_image: "default_logo.jpg", border: 1 },
			score: { active: false, height: 30, width: 20, win_color: "#1ab03d", loss_color: "#FF0000", neutral_color: "#0000FF", padding: 20 },
			url: ""
		};

		$.extend(true, ds, settings);


		this.PADDING = 15;

		this.canvas = document.getElementById(canvas_id);
		this.canvas.style.cursor = 'grab';

		//this.canvas.style.height = '100%';
		//this.canvas.style.width = '100%';
		this.settings = ds;

		this.controls = {/*from   www. de m  o2 s .  c  om*/
			display: this,
			view: {
				x: 0,
				y: 0,
				zoom: 1,
				width: 0,
				height: 0,
				MAX_ZOOM: 5,
				MIN_ZOOM: 1,
				SCROLL_SENSITIVITY: 0.05,
			},
			viewPos: { prevX: null, prevY: null, isDragging: false }
		};

		this.data = null;
		this.rounds = 0;
		this.players = 0;
		this.images = [];

		if (this.settings.logo.active) {
			this.settings.width = this.settings.width + this.settings.logo.width;
			if (this.settings.height < this.settings.logo.height) {
				this.settings.height = this.settings.logo.height;
			}
		}
		if (this.settings.score.active) {
			this.settings.width = this.settings.width + this.settings.score.width;
			if (this.settings.height < this.settings.score.height) {
				this.settings.height = this.settings.score.height;
			}
		}
		this.displayPhase = null;
		this.canvasHeight = 0;
		this.isDragging = false;
		this.dragStart = { x: 0, y: 0 };
		this.initialPinchDistance = null
		this.cameraZoom = 1
		this.lastZoom = this.cameraZoom

		let canvas = this.canvas;

		/*var that = this;
		interact(this.canvas).gesturable({
			onmove: function (event) {
				//var arrow = document.getElementById('arrow')
				that.controls.view.x = -event.dx;
				that.controls.view.y = -event.dy;
				//that.controls.view.zoom += event.ds

				that.render();				
			},
		});*/

		this.currentContinuousZoom = 1.0;
		this.currentOffsetX = -100;
		this.currentOffsetY = -100;

		this.bindActions();

		if (this.settings.data_url !== '') {
			this.loadData();
		}
	}

	clickHandler = (e) => {
		let action = $(e.target).data('action');
		if (action == 'reset-view') {
			this.resetView();
		} else
			if (action == 'view') {
				$(".tbv-tool-button").css('border-bottom', '0px solid red');
				$(e.target).css('border-bottom', '2px solid red');
				let view = $(e.target).data('view');
				if (view == 'null') {
					this.setDisplayPhase(null);
				} else {
					this.setDisplayPhase(view);
				}
			}

		//console.warn('Button clicked', action);
	}

	buildActionButtons = () => {
		if (this.tools) {
			return;
		}
		let parent = $(this.canvas).parent();
		parent.find('div').first().remove();
		let html = '<div class="text-left tournament-tool-bar"><button data-action="reset-view" class="tbv-tool-button btn btn-sm btn-primary"><i class="fa fa-refresh"></i> Resetar Visão</button>&nbsp;';
		if (this.data.rounds.length > 0) {
			html += '<button data-action="view" data-view="null"  class="tbv-tool-button btn btn-sm btn-warning" style="border-bottom:2px solid red;"><i class="fa fa-eye"></i> Todas</button>&nbsp;';
			for (var i = 0; i < this.data.rounds.length; i++) {
				html += '<button data-action="view" data-view="' + i + '" class="tbv-tool-button btn btn-sm btn-success"><i class="fa fa-eye"></i> Fase ' + (i + 1) + '</button>&nbsp;';
			}
		}

		html += '</div>';
		parent.prepend(html);

		if (this.settings.debug)
			parent.prepend('<p id="debug_info"></p>');

		$('.tbv-tool-button ').click(this.clickHandler.bind(this));
		this.tools = true;
	}

	setDisplayPhase = (index) => {
		this.displayPhase = index;

		this.render();
	}

	//function for making gradients in_var is the top
	//positition of the element you are filling
	makegrad = (ctx, in_var, settings) => {
		if (settings.gradient) {
			var gradient2 = ctx.createLinearGradient(0, in_var, 0, in_var + settings.height);
			var k;
			for (k = 0; k < settings.gradient.length; k++) {
				gradient2.addColorStop(settings.gradient[k].loc, settings.gradient[k].color);
			}

			return (gradient2);
		} else {
			var gradient2 = ctx.createLinearGradient(0, in_var, 0, in_var + settings.height);

			gradient2.addColorStop(0, "#ccc");
			gradient2.addColorStop(0.5, "#ccc");
			gradient2.addColorStop(0.5, "#bbb");

			return (gradient2);

			//otherwise return fill if no gradient is needed
			return (settings.background_color);
		}
	}

	loadImages = () => {
		var self = this;
		if (this.images.length == 0) {
			this.images[0] = new Image();
			this.images[0].onload = function () {
				self.render();
			}
			this.images[0].src = this.settings.url + this.settings.logo.default_image;
		}
		var j = 0;
		for (j = 0; j < this.data.images.length; j++) {
			let img = this.data.images[j];
			this.images[img.id] = new Image();
			this.images[img.id].onload = function () {
				self.render();
			}
			this.images[img.id].src = img.url;
		}
	}

	setData = (data) => {
		var self = this;
		self.data = JSON.parse(data);
		self.rounds = self.data.rounds.length;
		self.players = (self.data.rounds[0].matches.length * 2);
		self.buildActionButtons();
		if (self.images.length <= 1) {
			self.loadImages();
		}
		self.render();
	}

	loadData = () => {
		var self = this;
		//console.log('Load Data: ' + this.settings.data_url);
		$.ajax({

			'url': this.settings.data_url,
			'type': 'GET',
			'success': function (data) {
				//console.warn(data);
				self.data = data;// JSON.parse(data);
				self.rounds = self.data.rounds.length;
				self.players = (self.data.rounds[0].matches.length * 2);
				self.buildActionButtons();
				if (self.images.length <= 1) {
					self.loadImages();
				}
				self.render();

				if (self.settings.data_refresh_time > 0 && self.data.finished == false) {
					setTimeout(self.loadData, self.settings.data_refresh_time);
				}
			},
			'error': function (request, error) {
				//alert("Falha ao receber os dados.");
			}
		});
	}

	render = () => {
		if (this.rendering || this.data == null) return;

		this.rendering = true;
		this.build();
		this.rendering = false;
	}

	build = () => {
		if (this.settings.logo.active && this.images.length == 0) {
			this.loadImages();
		}
		//adjust canvas size to the right size.
		var x_adjustment = 0;
		var y_adjustment = 0;

		if (this.settings.logo.active) {
			x_adjustment += this.settings.logo.width;
		}

		this.canvasHeight = (this.players * (this.settings.height + this.settings.v_spacing)) + HEADER_HEIGHT + (this.settings.v_spacing * 3); 
		this.canvasWidth = ((this.rounds * (this.settings.width +x_adjustment + this.settings.h_spacing ))+ this.settings.width+x_adjustment);

		this.canvas.height = this.canvasHeight;
		this.canvas.width = this.canvasWidth;
		this.controls.view.width = this.canvas.width;
		this.controls.view.height = this.canvas.height;

		//Check to see if browser will use canvas
		var ctx = this.canvas.getContext('2d');

		//ctx.clearRect(0, 0, this.canvas.width, this.canvas.heigh);
		ctx.fillStyle = "#FFFFFFFF";
		//ctx.fillStyle = "#0000FFFF";
		ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
		ctx.save();
		ctx.strokeStyle = "#000000FF";
		ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);
		//ctx.scale(this.cameraZoom, this.cameraZoom);
		//ctx.translate( this.cameraOffset.x, this.cameraOffset.y );

		ctx.translate(this.controls.view.x, this.controls.view.y);
		ctx.scale(this.controls.view.zoom, this.controls.view.zoom);

		var i;

		if (this.displayPhase !== null && this.displayPhase >= 0 && this.displayPhase < this.rounds) {
			this.buildRound(ctx, this.displayPhase, 0, true);
		} else {
			for (i = 0; i < this.rounds; i++) {
				let offset = i;
				/*if(i == (this.rounds-1) && this.data.finished && this.data.rounds[i].matches.length == 2)
				{
					offset = 0;
				}*/
				this.buildRound(ctx, i, offset, i == (this.rounds - 1));
			}
		}

		ctx.restore();

		// render debug
		if (this.settings.debug) {
			let debug = 'Zoom: ' + this.controls.view.zoom.toFixed(2) + ' Camera Offset: ' + this.controls.view.x.toFixed(2) + ', ' + this.controls.view.y.toFixed(2);
			ctx.fillStyle = '#FF0000';
			ctx.font = this.settings.text_style;
			ctx.fillText(debug, 10, 20);
		}
	}

	underline = (ctx, text, x, y) => {
		let metrics = measureText(ctx, text)
		let fontSize = Math.floor(metrics.actualHeight * 1.4) // 140% the height 
		switch (ctx.textAlign) {
			case "center": x -= (metrics.width / 2); break
			case "right": x -= metrics.width; break
		}
		switch (ctx.textBaseline) {
			case "top": y += (fontSize); break
			case "middle": y += (fontSize / 2); break
		}
		ctx.save()
		ctx.beginPath()
		ctx.strokeStyle = ctx.fillStyle
		ctx.lineWidth = Math.ceil(fontSize * 0.08)
		ctx.moveTo(x, y)
		ctx.lineTo(x + metrics.width, y)
		ctx.stroke()
		ctx.restore()
	}

	buildRound = (ctx, round, offset = 0, renderWinner = false) => {
		var phase = this.data.rounds[round];
		//adjust canvas size to the right size.
		var x_adjustment = 0;
		var y_adjustment = 0;

		if (this.settings.logo.active) {
			x_adjustment += this.settings.logo.width;
		}

		var j;

		var prot_y = this.settings.height + this.settings.v_spacing;
		var prot_x = this.settings.width + this.settings.h_spacing;

		if (this.settings.logo.active) {
			prot_x += this.settings.logo.width;
		}

		var draw_y = this.PADDING;
		// render phase header
		if (this.settings.phase_header) {
			let name = 'Fase ' + (round + 1) + ' (' + phase.matches.length + ' jogos)';
			//set up general defaults accoring to settings
			let dx = (offset * (prot_x)) + this.PADDING;

			ctx.fillStyle = this.settings.background_color;
			ctx.strokeStyle = this.settings.border_color; // red
			ctx.lineWidth = this.settings.border_width;
			ctx.font = this.settings.text_style;
			ctx.textBaseline = 'top';

			ctx.fillStyle = this.makegrad(ctx, this.PADDING, this.settings);
			ctx.fillRect((dx), draw_y, this.settings.width + x_adjustment, HEADER_HEIGHT);

			ctx.fillStyle = this.settings.round_text_color;
			ctx.fillText(name, dx + 5, draw_y + 8);
			if (this.settings.border_width > 0) {
				ctx.strokeRect((dx), draw_y, this.settings.width + x_adjustment, HEADER_HEIGHT);
			}

			draw_y += HEADER_HEIGHT + 15;
		}

		console.error(this.data);
		var prev_match = null;
		//set up general defaults accoring to settings
		for (j = 0; j < (phase.matches.length); j++) {
			var index = 0;
			if (Math.floor(j / 2) == (j / 2)) {
				index = (j / 2);
			} else {
				index = Math.floor(j / 2);
			}
			var match = phase.matches[j];
			//set up general defaults accoring to settings
			ctx.fillStyle = this.settings.background_color;
			ctx.strokeStyle = this.settings.border_color; // red
			ctx.lineWidth = this.settings.border_width;
			ctx.font = this.settings.text_style;
			ctx.textBaseline = 'top';

			match.xpos = (offset * (prot_x)) + this.PADDING;
			match.ypos = draw_y;//(yloc * (prot_y)) + (yadj * (prot_y)) - ((prot_y) * 1.5);
			match.right = match.xpos + this.settings.width;
			match.bottom = match.ypos + this.settings.height;

			//This is a mess... will tidy later (vaguely tidied now)
			ctx.fillStyle = this.makegrad(ctx, match.ypos, this.settings);
			ctx.fillRect((match.xpos), match.ypos, this.settings.width + x_adjustment, this.settings.height);

			//draw logo if active
			if (this.settings.logo.active && this.images.length > 0) {
				let img_index = 0;
				if (Math.floor(j / 2) == (j / 2)) {
					img_index = match.p1.id;
				} else {
					img_index = match.p2.id;
				}

				if(this.images[match.p1.id])
					ctx.drawImage(this.images[match.p1.id], match.xpos, match.ypos, this.settings.logo.width - 1, this.settings.logo.height);

				if(this.images[match.p2.id])
					ctx.drawImage(this.images[match.p2.id], match.xpos, match.bottom - this.settings.logo.height, this.settings.logo.width - 1, this.settings.logo.height);

				if (this.settings.logo.border > 0) {
					ctx.strokeRect(match.xpos + 1, match.ypos, this.settings.logo.width - 1, this.settings.logo.height);
					ctx.strokeRect(match.xpos + 1, match.bottom - this.settings.logo.height, this.settings.logo.width - 1, this.settings.logo.height);
				}
			}

			const Y_NEG_OFFSET = 20;
			//writescore if active
			if (this.settings.score.active) {

				ctx.fillStyle = this.settings.score.neutral_color;

				if (match.p1 != null && match.p1.score != null) {
					if (match.winner != null) {
						if (match.winner == 1) {
							ctx.fillStyle = this.settings.score.win_color;
						} else {
							ctx.fillStyle = this.settings.score.loss_color;
						}
					}
					ctx.fillText(match.p1.score, ((match.xpos + x_adjustment) + this.settings.width - this.settings.score.padding), match.ypos + 8);
				}

				ctx.fillStyle = this.settings.score.neutral_color;
				if (match.p2 != null && match.p2.score != null) {
					if (match.winner != null) {
						if (match.winner == 2) {
							ctx.fillStyle = this.settings.score.win_color;
						} else {
							ctx.fillStyle = this.settings.score.loss_color;
						}
					}
					ctx.fillText(match.p2.score, ((match.xpos + x_adjustment) + this.settings.width - this.settings.score.padding), match.bottom - Y_NEG_OFFSET);
				}

				ctx.fillStyle = this.settings.text_color;
			}

			//draw border if needed
			if (this.settings.border_width > 0) {
				ctx.strokeRect((match.xpos), match.ypos, this.settings.width + x_adjustment, this.settings.height);
			}

			//reset strokes in case you have different borders
			ctx.strokeStyle = this.settings.border_color;
			ctx.lineWidth = this.settings.border_width;

			//if player has a name...
			if (match.p1 != null) {
				//...set fill style to text color...
				ctx.fillStyle = this.settings.text_color;
				//...and the match has been played...
				if (match.winner != null) {
					//...and this poor fella has lost...
					if (match.winner == 2) {
						//...set the fill style to looser color...
						ctx.fillStyle = this.settings.text_color_loss;
					}
				}
				//...then write the NAME!
				ctx.fillText(match.p1.name, ((match.xpos + 5) + x_adjustment), match.ypos + 8);
			}
			//do the same thing for again for player two
			if (match.p2 != null) {
				ctx.fillStyle = this.settings.text_color;
				if (match.winner != null) {
					if (match.winner == 1) {
						ctx.fillStyle = this.settings.text_color_loss;
					}
				}
				ctx.fillText(match.p2.name, ((match.xpos + 5) + x_adjustment), match.bottom - Y_NEG_OFFSET);
			}


			if (match.final && !match.consolation) {
				var xpos = (match.xpos + this.settings.width + x_adjustment) + this.settings.score.padding;
				var half_y = this.settings.height / 2;
				var ballon_height = half_y - 8;
				if (match.p1.winner) {
					this.drawHintBalloon(ctx, xpos, match.ypos, 50, ballon_height, '1º', "#da0");
					this.drawHintBalloon(ctx, xpos, match.ypos + half_y, 50, ballon_height, '2º', "#ccc");
				} else {
					this.drawHintBalloon(ctx, xpos, match.ypos, 50, ballon_height, '2º', "#ccc");
					this.drawHintBalloon(ctx, xpos, match.ypos + half_y, 50, ballon_height, '1º', "#da0");
				}
			}
			if (match.consolation) {
				var xpos = (match.xpos + this.settings.width + x_adjustment) + this.settings.score.padding;
				var half_y = this.settings.height / 2;
				var ballon_height = half_y - 8;
				if (match.p1.winner) {
					this.drawHintBalloon(ctx, xpos, match.ypos + 4, 50, ballon_height, '3º', "#963");
					this.drawHintBalloon(ctx, xpos, match.ypos + half_y + 4, 50, ballon_height, '4º', "#678");
				} else {
					this.drawHintBalloon(ctx, xpos, match.ypos + 4, 50, ballon_height, '4º', "#678");
					this.drawHintBalloon(ctx, xpos, match.ypos + half_y + 4, 50, ballon_height, '3º', "#963");
				}
			}

			ctx.fillStyle = this.settings.text_color_game;
			ctx.fillText(match.game_name, ((match.xpos + 5)), match.ypos + ((this.settings.height / 2) - 8));
			prev_match = match;
			draw_y += prot_y;
		}
	}

	drawHintBalloon = (ctx, x, y, width, height, text, color, radius = 0) => {
		//const radius = 0;
		const pointerSize = 10;

		// Posição da ponta do triângulo (seta) — à esquerda, no meio da altura
		const pointerX = x - pointerSize;
		const pointerY = y + height / 2;

		ctx.save();
		ctx.beginPath();

		// Começa no topo esquerdo (após a seta)
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, pointerY + pointerSize / 2);

		// Triângulo (seta)
		ctx.lineTo(pointerX, pointerY);
		ctx.lineTo(x, pointerY - pointerSize / 2);

		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);

		ctx.closePath();

		// Estilos
		ctx.fillStyle = color || "#fff";
		ctx.strokeStyle = "#333";
		ctx.lineWidth = 1;
		ctx.fill();
		ctx.stroke();

		// Texto
		ctx.fillStyle = "#000";
		ctx.font = "18px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(text, x + width / 2, y + height / 2);

		ctx.restore();
	}

	drawFinalFlag = (ctx, xpos, ypos, classification) => {
		ctx.fillStyle = "#00FF00FF";
		ctx.fillRect(xpos, ypos, 30, 30);

		ctx.fillStyle = "#FF0000FF";
		ctx.fillText(classification, xpos + 10, ypos + 10);
	}
	// Gets the relevant location from a mouse or single touch event
	getEventLocation = (e) => {
		if (e.touches && e.touches.length == 1) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY }
		}
		else if (e.clientX && e.clientY) {
			return { x: e.clientX, y: e.clientY }
		}
	}


	touchStart = (e) => {
		e.preventDefault();
		let location = this.getEventLocation(e);

		this.panning = false;

		this.zooming = false;

		if (e.touches.length == 1) {

			this.panning = true;

			this.startX0 = e.touches[0].pageX;

			this.startY0 = e.touches[0].pageY;
		}

		if (e.touches.length == 2) {

			this.zooming = true;

			this.startX0 = e.touches[0].pageX;

			this.startY0 = e.touches[0].pageY;

			this.startX1 = e.touches[1].pageX;

			this.startY1 = e.touches[1].pageY;

			this.centerPointStartX = ((this.startX0 + this.startX1) / 2.0);

			this.centerPointStartY = ((this.startY0 + this.startY1) / 2.0);

			this.percentageOfImageAtPinchPointX = (this.centerPointStartX - this.currentOffsetX) / this.currentWidth;

			this.percentageOfImageAtPinchPointY = (this.centerPointStartY - this.currentOffsetY) / this.currentHeight;

			this.startDistanceBetweenFingers = Math.sqrt(Math.pow((this.startX1 - this.startX0), 2) + Math.pow((this.startY1 - this.startY0), 2));

		}

		this.canvas.style.cursor = 'grabbing';
	}

	touchEnd = (e) => {
		e.preventDefault();

		if (this.panning) {
			this.currentOffsetX = this.newOffsetX;
			this.currentOffsetY = this.newOffsetY;
		}
		else if (this.zooming) {
			this.currentOffsetX = this.newOffsetX;
			this.currentOffsetY = this.newOffsetY;
			this.currentContinuousZoom = this.newContinuousZoom;
		}

		this.zooming = false;
		this.panning = false;

		this.canvas.style.cursor = 'grab';
		this.render();
	}

	touchMove = (e) => {
		if (this.panning) {

			this.endX0 = e.touches[0].pageX;

			this.endY0 = e.touches[0].pageY;

			this.translateFromTranslatingX = this.endX0 - this.startX0;

			this.translateFromTranslatingY = this.endY0 - this.startY0;

			this.newOffsetX = this.currentOffsetX + this.translateFromTranslatingX;

			this.newOffsetY = this.currentOffsetY + this.translateFromTranslatingY;

			this.controls.view.x = this.newOffsetX;
			this.controls.view.y = this.newOffsetY;
			//$("#debug_info").html('Panning...');	
		}

		else if (this.zooming) {
			// Get the new touches
			this.endX0 = e.touches[0].pageX;

			this.endY0 = e.touches[0].pageY;

			this.endX1 = e.touches[1].pageX;

			this.endY1 = e.touches[1].pageY;

			// Calculate current distance between points to get new-to-old pinch ratio and calc width and height

			this.endDistanceBetweenFingers = Math.sqrt(Math.pow((this.endX1 - this.endX0), 2) + Math.pow((this.endY1 - this.endY0), 2));

			this.pinchRatio = this.endDistanceBetweenFingers / this.startDistanceBetweenFingers;

			this.newContinuousZoom = this.pinchRatio * this.currentContinuousZoom;
			this.newContinuousZoom = Math.min(this.newContinuousZoom, this.controls.view.MAX_ZOOM)
			this.newContinuousZoom = Math.max(this.newContinuousZoom, this.controls.view.MIN_ZOOM)

			this.controls.view.zoom = this.newContinuousZoom;
			//$("#debug_info").html('newContinuousZoom:  ' + this.newContinuousZoom + ' Zoom: ' + this.controls.view.zoom);	
		}

		this.render();
	}

	bindActions = () => {
		this.canvas.addEventListener('touchstart', this.touchStart.bind(this));
		this.canvas.addEventListener('touchend', this.touchEnd.bind(this));
		this.canvas.addEventListener('touchmove', this.touchMove.bind(this));

		this.canvas.addEventListener('wheel', (e) => Controls.zoom(this.controls).worldZoom(e));
		this.canvas.addEventListener('mousedown', (e) => Controls.move(this.controls).mousePressed(e));
		this.canvas.addEventListener('mousemove', (e) => Controls.move(this.controls).mouseDragged(e));
		this.canvas.addEventListener('mouseup', (e) => Controls.move(this.controls).mouseReleased(e));
	}

	setZoom = (val) => {
		this.controls.view.zoom = val;
		this.render();
	}

	setCamera = (x, y) => {
		this.controls.view.x = -x;
		this.controls.view.y = -y;
		this.render();
	}

	resetView = () => {
		this.controls.view.zoom = 1;
		this.controls.view.x = 0;
		this.controls.view.y = 0;
		this.render();
	}

};
