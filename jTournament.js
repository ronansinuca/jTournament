
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

TournamentBracket = class {
	constructor(canvas_id, settings) {

		//Default Options
		var ds = {
			debug: false,
			data_url: '',
			data_refresh_time: 10000,
			width: 40,
			height: 30,
			v_spacing: 10,
			h_spacing: 10,
			phase_header: 30,
			phase_header_text_color: "#fff",
			padding: 10,
			background_color: "#EDEDED",
			border_color: "#000000",
			border_width: "1",
			bracket_color: "#000000",
			bracket_width: "2",
			text_color: "#000000",
			text_color_loss: "#666666",
			text_style: "italic 11px verdana",


			game_gradient: [
				{ loc: 0, color: '#e8e8e8' },
				//{ loc: 0.5, color: '#4cc775' },
				{ loc: 0.5, color: '#a19d9d' }
			],
			game_color: "#e8e8e8",

			game_winner_gradient: [
				{ loc: 0, color: '#4cc775' },
				//{ loc: 0.5, color: '#4cc775' },
				{ loc: 0.5, color: '#034a1b' }
			],
			game_winner_color: "#fff",

			game_looser_gradient: [
				{ loc: 0, color: '#fa9d9d' },
				//{ loc: 0.5, color: '#4cc775' },
				{ loc: 0.5, color: '#c70c0c' }
			],
			game_looser_color: "#fa9d9d",

			group_header_gradient: [
				{ loc: 0, color: '#4F4F4F' },
				{ loc: 0.5, color: '#1B1B1B' },
				{ loc: 0.5, color: '#000000' }
			],
			group_header_color: "#fff",
			phase_header_gradient: [
				{ loc: 0, color: '#4F4F4F' },
				{ loc: 0.5, color: '#1B1B1B' },
				{ loc: 0.5, color: '#000000' }
			],
			phase_header_color: "#fff",
			final_game_gradient: [
				{ loc: 0, color: '#4cc775' },
				//{ loc: 0.5, color: '#4cc775' },
				{ loc: 0.5, color: '#034a1b' }
			],
			final_game_color: "#fab",
			logo: { active: false, height: 30, width: 30, default_image: "default_logo.jpg", border: 1 },
			score: { active: false, height: 30, width: 30, win_color: "#fff", loss_color: "#fff", neutral_color: "#fff", padding: 20 },
			links: { active: false },
			url: ""
		};

		$.extend(true, ds, settings);
		this.settings = ds;

		this.controls = {/*from   www.demo2s.com*/
			display: this,
			view: {
				x: 0,
				y: 0,
				zoom: 1,
				width: 0,
				height: 0,
				MAX_ZOOM: 5,
				MIN_ZOOM: 0.2,
				SCROLL_SENSITIVITY: 0.05,
			},
			viewPos: { prevX: null, prevY: null, isDragging: false }
		};

		this.data = null;


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

		this.HEADER_SIZE = 50;
		//adjust canvas size to the right size.
		this.x_adjustment = 0;
		this.y_adjustment = 0;

		if (this.settings.logo.active) {
			this.x_adjustment += this.settings.logo.width;
		}

		this.canvas = document.getElementById(canvas_id);
		this.canvas.style.cursor = 'grab';

		this.back_buffers = [];
		//this.canvas.style.cursor = 'grab';

		this.defaultPlayerImage = new Image();
		this.defaultPlayerImage.src = './default_user.jpg';// this.settings.logo.default_image;

		//Check to see if browser will use canvas
		if (this.canvas.getContext) {
			this.ctx = this.canvas.getContext('2d');
		} else {
			//shout at them for failski bowser choice
			alert("Your Browser Fails, please download something from the 21st century");
		}

		if (this.settings.data_url !== '') {
			this.loadData();
		}

		this.bindActions();
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

	//function for making gradients in_var is the top
	//positition of the element you are filling
	makegrad = (ctx, in_var, gradient, background_color, height) => {
		if (gradient) {
			var gradient2 = ctx.createLinearGradient(0, in_var, 0, in_var + height);
			for (var k = 0; k < gradient.length; k++) {
				gradient2.addColorStop(gradient[k].loc, gradient[k].color);
			}

			return (gradient2);
		} else {
			//otherwise return fill if no gradient is needed
			return (background_color);
		}
	}

	loadImages = () => {
		var self = this;
		var j = 0;
		for (j = 0; j < this.data.players.length; j++) {
			this.data.players[j].image = new Image();
			this.data.players[j].image.onload = function () {
				if (this.j == this.last_player) {
					this.manager.render();
				}
			}
			this.data.players[j].image.src = this.data.players[j].profile_image;
			this.data.players[j].image.manager = this;
			this.data.players[j].image.j = j;
			this.data.players[j].image.last_player = this.data.players.length - 1;
		}
	}

	getPlayerById = (id) => {
		for (var j = 0; j < this.data.players.length; j++) {
			if (this.data.players[j].id == id)
				return this.data.players[j];
		}
		return null;
	}

	setData = (data) => {
		if (typeof data === 'string') {
			this.data = JSON.parse(data);
		} else {
			this.data = data;
		}

		this.loadImages();
		this.setupGroups();
		this.render();
	}

	loadData = () => {
		if (this.settings.data_url == '') return;

		var self = this;
		$.ajax({

			'url': this.settings.data_url,
			'type': 'GET',
			'success': function (data) {
				self.setData(data);

				if (self.settings.data_refresh_time > 0 && self.data.finished == false) {
					setTimeout(self.loadData, self.settings.data_refresh_time);
				}
			},
			'error': function (request, error) {
				//alert("Falha ao receber os dados.");
			}
		});
	}

	setupGroups = () => {
		for (var j = 0; j < this.data.players.length; j++) {
			let player = this.data.players[j];
			if (typeof this.data.groups[player.group - 1].players === undefined) {
				this.data.groups[player.group].players = [];
			}
			this.data.groups[player.group - 1].players.push(player);
		}

		this.back_buffers = [];
		for (var i = 0; i < this.data.groups.length; i++) {
			this.data.groups[i].index = i;
			this.data.groups[i].width = 0;
			this.data.groups[i].height = 0;
			this.data.groups[i].final = false;
			this.data.groups[i].render = false;
			this.data.groups[i].flip = (i == 1) || (i == 3);

			this.calculateGroupSize(this.data.groups[i]);

			var back_buffers = document.createElement('canvas');
			back_buffers.width = this.data.groups[i].width;
			back_buffers.height = this.data.groups[i].height;
			this.back_buffers.push(back_buffers);
		}
	}

	getFinalRoundGroupWidth = () => {
		if (this.data.groups[this.data.groups.length-1].rounds.length > 0) {
			return this.settings.width + 50;
		}
		return this.settings.h_spacing;
	}

	getFinalRoundGroupItemHeight = () => {
		return (this.settings.height * 2.5);
	}

	getFinalRoundGroupHeight = () => {
		return (this.getFinalRoundGroupItemHeight() * 2) + this.settings.v_spacing + (this.settings.height * 4) + (this.settings.v_spacing * 4);
	}

	render = () => {
		if (this.rendering || this.data == null) return;

		this.rendering = true;

		for (var i = 0; i < this.data.groups.length - 1; i++) {
			var group = this.data.groups[i];
			this.renderGroup(group, group.flip, false);
		}

		this.renderFinal();

		this.drawBuffers();
		this.rendering = false;

		// render debug
		if (this.settings.debug)
		{
			this.ctx.font = "bold 30px verdana";
			let debug = 'Zoom: ' + this.controls.view.zoom.toFixed(2) + ' Camera Offset: ' + this.controls.view.x.toFixed(2) + ', ' + this.controls.view.y.toFixed(2);
			this.ctx.fillStyle = '#0006';
			this.ctx.fillRect(0, 0, this.ctx.canvas.width, 50);
			this.ctx.fillStyle = '#fff';
			this.ctx.fillText(debug, 10, 30);
		}
	}

	defineGroupsCords = () => {

		const A = 0;
		const B = 1;
		const C = 2;
		const D = 3;

		var group_count = this.data.groups.length;
		var final_spacing = this.getFinalRoundGroupWidth();

		for (var i = 0; i < group_count - 1; i++) {
			var group = this.data.groups[i];

			group.dx = 0;
			group.dy = 0;

			// goup a, b and final group
			if(group_count == 3) {
				if(i == 1){
					group.dx = this.data.groups[A].width + final_spacing /*+ this.settings.h_spacing*/;
				}
			} /*else {
				group.dx = this.data.groups[A].width + final_spacing;
			}*/
		}

		//if(group_count == 3) {
			this.data.groups[group_count - 1].dx = this.data.groups[A].width;
			let max = Math.max(this.data.groups[A].height, this.data.groups[B].height);
			this.data.groups[group_count - 1].dy = ((max / 2) + this.HEADER_SIZE + 10) - (this.getFinalRoundGroupItemHeight() / 2);	
		/*} else {
			this.data.groups[group_count - 1].dx = this.data.groups[A].width;
			let max = Math.max(this.data.groups[A].height, this.data.groups[B].height);
			this.data.groups[group_count - 1].dy = ((max / 2) + this.HEADER_SIZE) - (this.data.groups[group_count - 1].height / 2);	
		}*/
	}

	drawBuffers = () => {

		this.defineGroupsCords();

		const A = 0;
		const B = 1;
		const C = 2;
		const D = 3;

		var final_spacing = this.getFinalRoundGroupWidth();

		this.canvas.width = this.data.groups[A].width + this.data.groups[B].width + final_spacing + (this.settings.padding * 2) + this.settings.h_spacing;
		this.canvas.height = Math.max(this.data.groups[A].height, this.data.groups[B].height) + (this.settings.padding * 2) + this.HEADER_SIZE + 10;

		this.controls.view.width = this.canvas.width;
		this.controls.view.height = this.canvas.height;

		this.ctx.fillStyle = this.settings.background_color;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		
		this.ctx.save();

		this.ctx.translate(this.controls.view.x, this.controls.view.y);
		this.ctx.scale(this.controls.view.zoom, this.controls.view.zoom);

		for (var i = 0; i < this.data.groups.length; i++) {
			var group = this.data.groups[i];
			if(!group.render) continue;

			var canvas = this.back_buffers[i];
			if (canvas.height <= 0) continue;

			var dx = group.dx + this.settings.padding;
			var dy = group.dy + this.settings.padding;

			if(!group.final && this.data.groups.length > 2) {
				this.ctx.fillStyle = this.makegrad(this.ctx, dy, this.settings.group_header_gradient, this.settings.group_header_color, this.HEADER_SIZE);
				this.ctx.fillRect(dx, dy, canvas.width, this.HEADER_SIZE);

				//this.ctx.textBaseline = 'top';
				this.ctx.fillStyle = this.settings.text_color;
				this.ctx.font = "italic 22px verdana";
				this.ctx.textBaseline = 'middle';
				this.ctx.fillText(group.name, dx + 10, dy + ((this.HEADER_SIZE / 2)));
				dy += this.HEADER_SIZE + 10;
			}
			
			this.ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, canvas.width, canvas.height);
			//this.ctx.strokeRect(dx, dy, canvas.width, canvas.height + this.HEADER_SIZE)		;
		}
		this.ctx.restore();
		this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
	}

	renderFinal = () => {
		/*if (!this.data.finished) {
			return;
		}*/


		var finished_colors = [
			"#da0",
			"#ccc",
			"#963",
			"#678"
		];

		var group_width = this.getFinalRoundGroupWidth();// this.settings.width + 50 + (this.settings.h_spacing);
		var item_height = this.getFinalRoundGroupItemHeight();

		var canvas = this.back_buffers[this.data.groups.length - 1];
		canvas.width = this.getFinalRoundGroupWidth();
		canvas.height = this.getFinalRoundGroupHeight();
	
		var ctx = canvas.getContext('2d');
		ctx.fillStyle = this.settings.background_color;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		var group = this.data.groups[this.data.groups.length - 1];
		if(group.rounds.length <= 0) return;

		group.render = true;

		group.final = true;
		var draw_x = 0;
		var draw_y = 0;

		ctx.fillStyle = this.settings.game_winner_color;
		ctx.strokeStyle = this.settings.border_color; // red
		ctx.lineWidth = this.settings.border_width;
		ctx.font = this.settings.text_style;
		ctx.textBaseline = 'top';

		// FINAL GAME >>>>
		ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.final_game_gradient, this.settings.final_game_color, item_height);
		ctx.fillRect(0, 0, canvas.width, item_height);
		ctx.strokeRect(0, 0, canvas.width, item_height);

		ctx.fillStyle = this.settings.text_color;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.fillText(group.rounds[0].matches[0].game_name, canvas.width / 2, draw_y + (item_height / 2));
		ctx.textBaseline = 'top';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';

		// Player 1 Image
		let player1 = this.getPlayerById(group.rounds[0].matches[0].p1.id);
		ctx.drawImage(player1.image, 0, 0, this.settings.logo.width, this.settings.logo.height);
		ctx.strokeRect(0, 0, this.settings.logo.width, this.settings.logo.height);

		// Player 2 Image
		let player2 = this.getPlayerById(group.rounds[0].matches[0].p2.id);
		ctx.drawImage(player2.image, 0, item_height - this.settings.logo.height, this.settings.logo.width, this.settings.logo.height);
		ctx.strokeRect(0, item_height - this.settings.logo.height, this.settings.logo.width, this.settings.logo.height);

		var name_offset = 5;
		// draw Player name
		var text_x_pos = this.settings.logo.width + name_offset;

		ctx.fillStyle = this.settings.text_color;
		if (group.rounds[0].matches[0].winner == 2) {
			//ctx.fillStyle = this.settings.text_color_loss; 
		}
		ctx.fillText(group.rounds[0].matches[0].p1.name, text_x_pos, draw_y + (this.settings.height / 2));

		ctx.fillStyle = this.settings.text_color;
		if (group.rounds[0].matches[0].winner == 1) {
			//ctx.fillStyle = this.settings.text_color_loss;
		}
		ctx.fillText(group.rounds[0].matches[0].p2.name, text_x_pos, draw_y + item_height - (this.settings.height / 2));

		text_x_pos = ((canvas.width) - (this.settings.score.width / 2));

		ctx.textAlign = 'center';

		// Player 1 Score
		if (group.rounds[0].matches[0].winner == 1) {
			ctx.fillStyle = this.settings.score.win_color;
		} else {
			ctx.fillStyle = this.settings.score.loss_color;
		}
		ctx.fillText(group.rounds[0].matches[0].p1.score, text_x_pos, draw_y + (this.settings.height / 2));

		// Player 2 Score
		if (group.rounds[0].matches[0].winner == 2) {
			ctx.fillStyle = this.settings.score.win_color;
		} else {
			ctx.fillStyle = this.settings.score.loss_color;
		}
		ctx.fillText(group.rounds[0].matches[0].p2.score, text_x_pos, (draw_y + item_height) - (this.settings.height / 2));
		// FINAL GAME <<<<

		draw_x = 0;
		draw_y = item_height + this.settings.v_spacing;
		ctx.fillStyle = this.settings.game_winner_color;
		ctx.strokeStyle = this.settings.border_color; // red
		ctx.lineWidth = this.settings.border_width;
		ctx.font = this.settings.text_style;
		ctx.textBaseline = 'top';

		// CONSOLATION GAME >>>>
		ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.final_game_gradient, this.settings.final_game_color, item_height);
		ctx.fillRect(0, draw_y, canvas.width, item_height);
		ctx.strokeRect(0, draw_y, canvas.width, item_height);

		ctx.fillStyle = this.settings.text_color;

		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.fillText(group.rounds[0].matches[1].game_name, canvas.width / 2, draw_y + (item_height / 2));
		ctx.textBaseline = 'top';
		ctx.textAlign = 'left';

		// Player 1 Image
		player1 = this.getPlayerById(group.rounds[0].matches[1].p1.id);
		ctx.drawImage(player1.image, 0, draw_y, this.settings.logo.width, this.settings.logo.height);
		ctx.strokeRect(0, draw_y, this.settings.logo.width, this.settings.logo.height);

		// Player 2 Image
		player2 = this.getPlayerById(group.rounds[0].matches[1].p2.id);
		ctx.drawImage(player2.image, 0, (draw_y + item_height) - this.settings.logo.height, this.settings.logo.width, this.settings.logo.height);
		ctx.strokeRect(0, (draw_y + item_height) - this.settings.logo.height, this.settings.logo.width, this.settings.logo.height);
		
		// draw Player name
		var text_x_pos = this.settings.logo.width + name_offset;
		ctx.textBaseline = 'middle';

		ctx.fillStyle = this.settings.text_color;
		if (group.rounds[0].matches[1].winner == 2) {
			//ctx.fillStyle = this.settings.text_color_loss;
		}
		ctx.fillText(group.rounds[0].matches[1].p1.name, text_x_pos, draw_y + (this.settings.height / 2));

		ctx.fillStyle = this.settings.text_color;
		if (group.rounds[0].matches[0].winner == 1) {
			//ctx.fillStyle = this.settings.text_color_loss;
		}
		ctx.fillText(group.rounds[0].matches[1].p2.name, text_x_pos, draw_y + item_height - (this.settings.height / 2));

		text_x_pos = ((canvas.width) - (this.settings.score.width / 2));
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		// Player 1 Score
		if (group.rounds[0].matches[1].winner == 1) {
			ctx.fillStyle = this.settings.score.win_color;
		} else {
			ctx.fillStyle = this.settings.score.loss_color;
		}
		ctx.fillText(group.rounds[0].matches[1].p1.score, text_x_pos, draw_y + (this.settings.height / 2));

		// Player 2 Score
		if (group.rounds[0].matches[1].winner == 2) {
			ctx.fillStyle = this.settings.score.win_color;
		} else {
			ctx.fillStyle = this.settings.score.loss_color;
		}
		ctx.fillText(group.rounds[0].matches[1].p2.score, text_x_pos, (draw_y + item_height) - (this.settings.height / 2));
		// CONSOLATION GAME <<<<

		if(group.rounds[0].matches[0].winner == 0 || group.rounds[0].matches[1].winner == 0) return;

		draw_y += item_height + this.settings.v_spacing;

		var names = [];

		if (group.rounds[0].matches[0].winner == 1) {
			names.push(group.rounds[0].matches[0].p1.name);
			names.push(group.rounds[0].matches[0].p2.name);
		} else {
			names.push(group.rounds[0].matches[0].p2.name);
			names.push(group.rounds[0].matches[0].p1.name);
		}

		if (group.rounds[0].matches[1].winner == 1) {
			names.push(group.rounds[0].matches[1].p1.name);
			names.push(group.rounds[0].matches[1].p2.name);
		} else {
			names.push(group.rounds[0].matches[1].p2.name);
			names.push(group.rounds[0].matches[1].p1.name);
		}
		var balloon_xpos = this.settings.width + 20;
		var balloon_height = this.settings.height;
		var balloon_width = 30;

		ctx.textAlign = 'left';

		for(var i = 0; i < names.length; i++){
			
			ctx.fillStyle = finished_colors[i];// this.makegrad(ctx, draw_y, this.settings.final_game_gradient, this.settings.final_game_color, this.settings.height);
			ctx.fillRect(0, draw_y, this.settings.width, this.settings.height);
			ctx.strokeRect(0, draw_y, this.settings.width, this.settings.height);

			let temp = i + 1;
			ctx.textBaseline = 'middle';
			ctx.fillStyle = '#000';
			ctx.fillText(/*temp + '\u00ba '  + */names[i], 5, draw_y + (this.settings.height / 2));

			this.drawHintBalloon(ctx, balloon_xpos, draw_y, balloon_width, balloon_height, temp + '\u00ba ', finished_colors[i]);

			draw_y += this.settings.height + this.settings.v_spacing;
		}		
	}

	drawHintBalloon = (ctx, x, y, width, height, text, color/*, radius = 0*/) => {
		const radius = 0;
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

	calculateGroupsSize = () => {
		for (var g = 0; g < this.data.groups.length; g++) {
			var group = this.data.groups[g];
			this.calculateGroupSize(this.data.groups[g]);
		}
	}

	calculateGroupSize = (group) => {
		this.renderGroup(group, false, true);
	}

	renderGroup = (group, flip, sizes_only) => {

		var ctx = null;
		if (!sizes_only) {
			ctx = this.back_buffers[group.index].getContext('2d');

			ctx.fillStyle = this.settings.background_color;
			ctx.fillRect(0, 0, group.width, group.height);
		}

		var half_height = (this.settings.height / 2);
		var colors = ['#f00', '#0f0'];

		// i = rounds, j = players in matches in that round
		for (var i = 0; i < group.rounds.length; i++) {
			var round_name_rendered = false;
			for (var j = 0; j < (group.rounds[i].matches.length * 2); j++) {
				//general formular is (((2^i)*(j+1))+(1-(2^i))) I broke it down for my own sanitity.
				var c = (Math.pow(2, (i)));
				var n = j + 1;
				var yloc = (c * n) + (1 - c); /*(this.settings.h_spacing * 2) + */
				var yloc_next = ((Math.pow(2, (i + 1))) * (Math.ceil((j + 1) / 2))) + (1 - (Math.pow(2, (i + 1))));
				var ygap = ((c * (n + 1)) + (1 - c)) - yloc;
				var yadj = ygap / 2;
				var ygap_next = ((Math.pow(2, (i + 1))) * (Math.ceil((j + 1) / 2) + 1)) + (1 - (Math.pow(2, (i + 1)))) - yloc_next;
				var yadj_next = (ygap_next / 2);
				var prot_y = this.settings.height + this.settings.v_spacing;
				var prot_x = this.settings.width + this.settings.h_spacing;

				var dx = (i * prot_x);

				var draw_x = (dx);
				if (flip) {
					draw_x = group.width - (dx) - this.settings.width;
				}

				var draw_y = ((yloc * prot_y) + (yadj * prot_y) - (prot_y * 1.5)) + this.settings.phase_header;


				if (draw_y + this.settings.height > group.height) {
					group.height = draw_y + this.settings.height;
				}
				if (draw_x + this.settings.width > group.width) {
					group.width = draw_x + this.settings.width + this.settings.h_spacing;
				}

				if (sizes_only) {
					group.height += 10;
					continue;
				}

				group.render = true;
				//set up general defaults accoring to settings
				ctx.fillStyle = this.settings.game_winner_color;
				ctx.strokeStyle = this.settings.border_color; // red
				ctx.lineWidth = this.settings.border_width;
				ctx.font = this.settings.text_style;
				ctx.textBaseline = 'top';

				if (!round_name_rendered) {
					round_name_rendered = true;
					ctx.fillStyle = this.makegrad(ctx, 1, this.settings.phase_header_gradient, this.settings.phase_header_color, this.settings.phase_header);
					ctx.fillRect(draw_x+1, 1, this.settings.width, this.settings.phase_header - 2);
					ctx.strokeRect(draw_x+1, 1, this.settings.width, this.settings.phase_header - 2);

					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillStyle = this.settings.phase_header_text_color;
					let name = group.rounds[i].phase_name;
					if(name == undefined) name = 'Fase ' + group.rounds[i].phase;
					ctx.fillText(name, draw_x + (this.settings.width / 2), (this.settings.phase_header / 2));
					
				}
				ctx.textBaseline = 'top';

				draw_y += 10;

				var looser_game = false;
				var winner_game = false;
				var extra_match = false;

				if (Math.floor(j / 2) == (j / 2)) {
					if (group.rounds[i].matches[(j / 2)].p1 != null) {
						//...and the match has been played...
						if (group.rounds[i].matches[(j / 2)].winner != null) {
							//...and this poor fella has lost...
							if (group.rounds[i].matches[(j / 2)].winner == 2) {
								looser_game = true;
							} else {
								winner_game = true;
							}
						}
					}
					extra_match = group.rounds[i].matches[(j / 2)].extra_match;
				} else {
					if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null) {
						if (group.rounds[i].matches[Math.floor(j / 2)].winner != null) {
							if (group.rounds[i].matches[Math.floor(j / 2)].winner == 1) {
								looser_game = true;
							} else {
								winner_game = true;
							}
						}
					}
					extra_match = group.rounds[i].matches[Math.floor(j / 2)].extra_match;
				}

				//This is a mess... will tidy later (vaguely tidied now)
				if(looser_game)
					ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.game_looser_gradient, this.settings.game_looser_color, this.settings.height);
				else if(winner_game) 
					ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.game_winner_gradient, this.settings.game_winner_color, this.settings.height);
				else {
					if(extra_match)
						ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.game_winner_gradient, this.settings.game_winner_color, this.settings.height);
					else ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.game_gradient, this.settings.game_color, this.settings.height);
				}

				{ //draw them brakets
					//set bracket options
					ctx.strokeStyle = this.settings.bracket_color;
					ctx.lineWidth = this.settings.bracket_width;

					if ((i < group.rounds.length - 1) || this.data.finished)
					{
						
						ctx.beginPath();
						if (flip) {
							let offset = group.width;
							//move to right middle of element just dawn
							ctx.moveTo((offset - (dx + this.settings.width)), draw_y + half_height);

							// draw horizontal line to 1/2 of h_spacing
							ctx.lineTo((offset - (dx + this.settings.width + (this.settings.h_spacing / 2))), draw_y + half_height);

							//draw vertical line to y of the middle of the next element
							ctx.lineTo((offset - (dx + this.settings.width + (this.settings.h_spacing / 2))), ((yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.phase_header + 10));

							//draw horizontal to next element
							ctx.lineTo((offset - ((dx + prot_x) + (this.settings.width / 2))), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.phase_header + 10);
						} else {
							//move to right middle of element just dawn
							ctx.moveTo(((dx + this.settings.width)), draw_y + half_height);

							// draw horizontal line to 1/2 of h_spacing
							ctx.lineTo(((dx + this.settings.width + (this.settings.h_spacing / 2))), draw_y + half_height);

							//draw vertical line to y of the middle of the next element
							ctx.lineTo(((dx + this.settings.width + (this.settings.h_spacing / 2))), ((yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.phase_header) + 10);

							//draw horizontal to next element
							ctx.lineTo(((dx + prot_x)) + (this.settings.width / 2), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.phase_header + 10);
						}
						ctx.stroke();
					}
				}
				ctx.fillRect(draw_x, draw_y, this.settings.width, this.settings.height);
				ctx.strokeRect(draw_x, draw_y, this.settings.width, this.settings.height);

				//draw logo if active
				if (this.settings.logo.active) {				
					var x_pos = draw_x;
					if (flip) {
						x_pos = (draw_x + this.settings.width) - this.settings.logo.width;
					}
					if (Math.floor(j / 2) == (j / 2)) {
						if (group.rounds[i].matches[(j / 2)].p1 != null /*&& group.rounds[i].matches[(j / 2)].p1.logo != null*/) {
							let player = this.getPlayerById(group.rounds[i].matches[(j / 2)].p1.id);
							if (player) {
								ctx.drawImage(player.image, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
							} else ctx.drawImage(this.defaultPlayerImage, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
						} else {
							ctx.drawImage(this.defaultPlayerImage, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
						}
					} else {
						if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null /*&& group.rounds[i].matches[Math.floor(j / 2)].p2.logo != null*/) {
							let player = this.getPlayerById(group.rounds[i].matches[Math.floor(j / 2)].p2.id);

							if (player) {
								ctx.drawImage(player.image, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
							} else ctx.drawImage(this.defaultPlayerImage, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
						} else {
							ctx.drawImage(this.defaultPlayerImage, x_pos, draw_y, this.settings.logo.width, this.settings.logo.height);
						}
					}
					if (this.settings.logo.border > 0) {
						ctx.strokeRect(draw_x + 1, draw_y, this.settings.width - 1, this.settings.height);
					}
				}

				//writescore if active
				if (this.settings.score.active) {
					var x_pos = ((draw_x + this.settings.width) - this.settings.score.width);
					var text_x_pos = ((draw_x + this.settings.width) - (this.settings.score.width / 2));

					if (flip) {
						x_pos = draw_x;
						text_x_pos = draw_x + (this.settings.score.width / 2);
					}

					ctx.fillRect(x_pos, draw_y, this.settings.score.width - 1, this.settings.height);

					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillStyle = this.settings.score.neutral_color;
					if (Math.floor(j / 2) == (j / 2)) {
						if (group.rounds[i].matches[(j / 2)].p1 != null && group.rounds[i].matches[(j / 2)].p1.score != null) {
							if (group.rounds[i].matches[(j / 2)].winner != null) {
								if (group.rounds[i].matches[(j / 2)].winner == 1) {
									ctx.fillStyle = this.settings.score.win_color;
								} else {
									ctx.fillStyle = this.settings.score.loss_color;
								}
							}
							ctx.fillText(group.rounds[i].matches[(j / 2)].p1.score, text_x_pos, draw_y + (half_height));
						}
					} else {
						if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null && group.rounds[i].matches[Math.floor(j / 2)].p2.score != null) {
							if (group.rounds[i].matches[Math.floor(j / 2)].winner != null) {
								if (group.rounds[i].matches[Math.floor(j / 2)].winner == 2) {
									ctx.fillStyle = this.settings.score.win_color;
								} else {
									ctx.fillStyle = this.settings.score.loss_color;
								}
							}
							ctx.fillText(group.rounds[i].matches[Math.floor(j / 2)].p2.score, text_x_pos, draw_y + (half_height));
						}
					}
					ctx.fillStyle = this.settings.text_color;
				}
				ctx.textBaseline = 'top';

				//draw border if needed
				if (this.settings.border_width > 0) {
					ctx.strokeRect(draw_x, draw_y, this.settings.width, this.settings.height);
				}

				//reset strokes in case you have different borders
				ctx.strokeStyle = this.settings.border_color;
				ctx.lineWidth = this.settings.border_width;


				ctx.textAlign = 'left';
				var name_x = draw_x + 5;
				if(this.settings.logo.active){
					name_x += this.settings.logo.width;
				}

				ctx.textBaseline = 'middle';
				//...set fill style to text color...
				ctx.fillStyle = this.settings.text_color;
				//evens or odds I could use mods I think but I'm only a simple bear
				if (Math.floor(j / 2) == (j / 2)) {
					//if player has a name...
					if (group.rounds[i].matches[(j / 2)].p1 != null) {
						//...and the match has been played...
						if (group.rounds[i].matches[(j / 2)].winner != null) {
							//...and this poor fella has lost...
							if (group.rounds[i].matches[(j / 2)].winner == 2) {
								//...set the fill style to looser color...
								//ctx.fillStyle = this.settings.text_color_loss;
							}
						}
						//...then write the NAME!
						ctx.fillText(group.rounds[i].matches[(j / 2)].p1.name, name_x, draw_y + (half_height));
					}
				} else {
					//do the same thing for again for player two
					if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null) {
						if (group.rounds[i].matches[Math.floor(j / 2)].winner != null) {
							if (group.rounds[i].matches[Math.floor(j / 2)].winner == 1) {
								//ctx.fillStyle = this.settings.text_color_loss;
							}
						}
						ctx.fillText(group.rounds[i].matches[Math.floor(j / 2)].p2.name, name_x, draw_y + (half_height));
					}
				}
			}
		}
	}
}
