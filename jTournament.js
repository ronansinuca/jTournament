
TournamentBracket = class {
	constructor(canvas_id, settings) {

		//Default Options
		var ds = {
			data_url: '',
			data_refresh_time: 10000,
			width: 40,
			height: 30,
			v_spacing: 10,
			h_spacing: 10,
			padding: 10,
			background_color: "#EDEDED",
			border_color: "#000000",
			border_width: "1",
			bracket_color: "#000000",
			bracket_width: "2",
			text_color: "#000000",
			text_color_loss: "#666666",
			text_style: "italic 11px verdana",
			gradient: false,
			header_gradient: [{ loc: 0, color: '#4F4F4F' },
        { loc: 0.5, color: '#1B1B1B' },
        { loc: 0.5, color: '#000000' }],
			logo: { active: false, height: 30, width: 30, default_image: "default_logo.jpg", border: 1 },
			score: { active: false, height: 30, width: 10, win_color: "#00FF00", loss_color: "#FF0000", neutral_color: "#0000FF", padding: 20 },
			links: { active: false },
			url: ""
		};

		$.extend(true, ds, settings);
		this.settings = ds;

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


		this.PADDING = 15;
		this.GROUP_PADDING = 30;
		this.HEADER_SIZE = 50;
		//adjust canvas size to the right size.
		this.x_adjustment = 0;
		this.y_adjustment = 0;

		if (this.settings.logo.active) {
			this.x_adjustment += this.settings.logo.width;
		}

		console.log("Preparing the canvas for element " + canvas_id);
		this.canvas = document.getElementById(canvas_id);
		
		this.backCanvas = [];
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
	}

	//function for making gradients in_var is the top
	//positition of the element you are filling
	makegrad = (ctx, in_var, gradient, height) => {
		if (gradient) {
			var gradient2 = ctx.createLinearGradient(0, in_var, 0, in_var + height);
			for (var k = 0; k < gradient.length; k++) {
				gradient2.addColorStop(gradient[k].loc, gradient[k].color);
			}

			return (gradient2);
		} else {
			//otherwise return fill if no gradient is needed
			return (this.settings.background_color);
		}
	}

	loadImages = () => {
		var self = this;
		var j = 0;
		for (j = 0; j < this.data.players.length; j++) {
			this.data.players[j].image = new Image();
			this.data.players[j].image.onload = function () {
				//console.log("Image loaded ", this.j, this.last_player);
				if(this.j == this.last_player) {
					console.log('Images Loaded');
					this.manager.render();
				}
			}
			//console.log(this.data.players[j].profile_image);
			this.data.players[j].image.src = this.data.players[j].profile_image;
			this.data.players[j].image.manager = this;
			this.data.players[j].image.j = j;
			this.data.players[j].image.last_player =this.data.players.length - 1;
		}
	}

	getPlayerById = (id) => {
		for (var j = 0; j < this.data.players.length; j++) {
			if(this.data.players[j].id == id)
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
		console.log(this.data);

		this.loadImages();
		this.setupGroups();
		this.ajustSize();
		this.render();
	}

	loadData = () => {
		if (this.settings.data_url == '') return;

		var self = this;
		//console.log('Load Data: ' + this.settings.data_url);
		$.ajax({

			'url': this.settings.data_url,
			'type': 'GET',
			'success': function (data) {
				//console.warn(data);
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
		for(var j = 0; j < this.data.players.length; j++) {
			let player = this.data.players[j];
			if (typeof this.data.groups[player.group-1].players === undefined) {
				this.data.groups[player.group].players = [];
			}
			this.data.groups[player.group-1].players.push(player)	;
		}

		const A = 0;
		const B = 1;
		const C = 2;
		const D = 3;

		var groups = this.data.groups.length;
		if(this.data.finished){
			groups = groups -1;
		}

		var offsets = this.setupOffsets();

		this.backCanvas = [];
		for (var i = 0; i < this.data.groups.length; i++) {
			this.data.groups[i].index = i;
			this.data.groups[i].width = this.getGroupWidth(i);
			this.data.groups[i].height = this.getGroupHeight(i);
			this.data.groups[i].final_width = this.settings.padding * 2; 
			this.data.groups[i].final_height =  + this.settings.padding * 2; 

			if(i < groups)
				this.data.groups[i].offsets = offsets[i];

			var backCanvas = document.createElement('canvas');
			backCanvas.width = this.data.groups[i].width;
			backCanvas.height = this.data.groups[i].height;
			this.backCanvas.push(backCanvas);
			console.log(backCanvas);
		}

	}

	ajustSize = () => {

		var total_width = 0;
		var total_height = 0;
		var i;
		for (i = 0; i < this.data.groups.length; i++) {
			total_width = Math.max(total_width, this.data.groups[i].width);
			total_height += this.data.groups[i].height + this.settings.v_spacing;
		}
		
		console.log('Canvas Width: ', total_width);
		console.log('Canvas Height: ', total_height);
		$(this.canvas).attr('height', total_height);
		$(this.canvas).attr('width', total_width);
	}

	getGroupWithMaxMatches = (group_index) => {
		var ret = 0;
		for (var i = 0; i < this.data.groups[group_index].matches.length; i++) {
			if(this.data.groups[group_index].matches[i].rounds.length > ret)
				ret = this.data.groups[group_index].matches[i].rounds.length;
		}
		return ret;
	}

	getGroupHeight = (group_index) => {
		var group = this.data.groups[group_index];
		var height = group.players.length * (this.settings.height + this.settings.v_spacing);
		
		/*if(group_index < this.data.groups.length - 1)
		{
			height = group.players.length * (this.settings.height + this.settings.v_spacing);
		}*/
		return height * 3;
	}

	getGroupWidth = (group_index) => {
		var rounds = this.data.groups[group_index].rounds.length;
		return (rounds * (this.settings.width + this.x_adjustment + this.settings.h_spacing)) + this.settings.width + this.x_adjustment;
	}

	render = () => {
		if(this.rendering) return;

		console.log('Rendering');
		this.rendering = true;

		this.ctx.fillStyle = "#fff";
		//ctx.fillStyle = "#0000FFFF";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.save();

		var groups = this.data.groups.length;
		if(this.data.finished){
			groups = groups -1;
		}

		for (var i = 0; i < groups; i++) {

			var group = this.data.groups[i];
			this.renderGroup(group);

			//this.ctx.drawImage(this.backCanvas[group.index], group.dx, group.dy);
		}

		if(this.data.finished){
			this.renderFinal();
		}

		this.drawBuffers();
		this.rendering = false;
	}

	setupOffsets = () => {

		const A = 0;
		const B = 1;
		const C = 2;
		const D = 3;

		var groups = this.data.groups.length;

		var final_spacing = this.settings.h_spacing;
		if(this.data.finished){
			groups = groups -1;
			final_spacing = this.settings.width + (this.settings.h_spacing * 2);
		}

		var offsets = [];

		if(groups == 2){
			this.canvas.width = this.data.groups[A].final_width + this.data.groups[B].final_width + final_spacing + (this.PADDING *2);

			// this.canvas.height = Math.max(this.data.groups[A].final_height, this.data.groups[B].final_height) + this.HEADER_SIZE + (this.PADDING *2);
			this.canvas.height = this.data.groups[A].final_height + this.data.groups[B].final_height + (this.HEADER_SIZE * groups) + (this.PADDING *2) + this.settings.padding;

			offsets = [
				{flip: false, x: 0, y:0}, 
				//{flip: false, x: this.data.groups[A].final_width + final_spacing, y: 0}
				{flip: false, x: 0, y: this.data.groups[A].final_height + this.settings.padding + this.HEADER_SIZE }
			];
		} else

		if(groups == 4){
			this.canvas.width = this.data.groups[A].final_width + this.data.groups[C].final_width + final_spacing + (this.PADDING *2);

			let max_1 = Math.max(this.data.groups[A].final_height, this.data.groups[B].final_height);
			let max_2 = Math.max(this.data.groups[C].final_height, this.data.groups[D].final_height);
			this.canvas.height = Math.max(max_1, max_2) + this.GROUP_PADDING + (this.HEADER_SIZE * 2) + (this.PADDING *2);

			offsets = [
				{flip: false, x: 0, y:0}, 
				//{flip: false, x: this.data.groups[A].final_width + final_spacing, y: 0}
				{flip: false, x: 0, y: this.data.groups[A].final_height + this.settings.padding + this.HEADER_SIZE },
				{flip: false, x: 0, y: this.data.groups[B].final_height + this.settings.padding + this.HEADER_SIZE },
				{flip: false, x: 0, y: this.data.groups[C].final_height + this.settings.padding + this.HEADER_SIZE },
			];
		} else { // 1 group only
			this.canvas.width = this.data.groups[A].final_width + final_spacing + (this.PADDING *2);
			this.canvas.height = this.data.groups[A].final_height + this.HEADER_SIZE + (this.PADDING *2);
		}

		return offsets;
	}

	drawBuffers = () => {
		var groups = this.data.groups.length;

		var final_spacing = this.settings.h_spacing;
		if(this.data.finished){
			groups = groups -1;
			final_spacing = this.settings.width + (this.settings.h_spacing * 2);
		}

		var offsets = this.setupOffsets();
console.log(offsets);
		for (var i = 0; i < groups; i++) {
			var group = this.data.groups[i];
			var canavas = this.backCanvas[group.index];
			// console.log(group);
			if(canavas.height > 0) {
				var dx = offsets[i].x + this.PADDING;
				var dy = offsets[i].y + this.PADDING;

				this.ctx.fillStyle = this.makegrad(this.ctx, dy, this.settings.header_gradient, this.HEADER_SIZE);
				this.ctx.fillRect(dx, dy, group.final_width, this.HEADER_SIZE);

				//this.ctx.textBaseline = 'top';
				this.ctx.fillStyle = this.settings.text_color;
				this.ctx.font = "italic 22px verdana";
				this.ctx.fillText(group.name, dx + this.PADDING, dy + ((this.HEADER_SIZE / 2) ));

				dy +=  + this.HEADER_SIZE;

				this.ctx.strokeRect(dx, dy, group.final_width, group.final_height);

				console.log(dx, dy)
				
				this.ctx.save();
				//this.ctx.drawImage(this.backCanvas[group.index], group.dx, group.dy);
				if(group.offsets.flip) {
					this.ctx.scale(-1, 1);
					this.ctx.drawImage(canavas, 0, 0, group.final_width, group.final_height, -group.final_width, dy, -dx, group.final_height);
				} else {
					this.ctx.drawImage(canavas, 0, 0, group.final_width, group.final_height, dx, dy, group.final_width, group.final_height);
				}
				this.ctx.restore();
			}
		}
	}

	renderFinal = () => {
		var canvas = this.backCanvas[this.backCanvas.length-1];
		var ctx = canvas.getContext('2d');
	}

	renderGroup = (group) => {
		var logo_store = [];
		var ctx = this.backCanvas[group.index].getContext('2d');

		var half_height = (this.settings.height / 2);
		var colors = ['#f00', '#0f0'];
		//ctx.strokeStyle = colors[group.index];
		//ctx.strokeRect(1, 1, group.width-1, group.height-1);

		// i = rounds, j = players in matches in that round
		for (var i = 0; i < group.rounds.length; i++) {
			//console.log("Group", i);
			for (var j = 0; j < (group.rounds[i].matches.length * 2); j++) {
				//console.log("Round", j);
				//set up general defaults accoring to settings
				ctx.fillStyle = this.settings.background_color;
				ctx.strokeStyle = this.settings.border_color; // red
				ctx.lineWidth = this.settings.border_width;
				ctx.font = this.settings.text_style;
				ctx.textBaseline = 'top';
				//general formular is (((2^i)*(j+1))+(1-(2^i))) I broke it down for my own sanitity.
				var c = (Math.pow(2, (i)));
				var n = j + 1;
				var yloc = (c * n) + (1 - c);
				var yloc_next = ((Math.pow(2, (i + 1))) * (Math.ceil((j + 1) / 2))) + (1 - (Math.pow(2, (i + 1))));
				var ygap = ((c * (n + 1)) + (1 - c)) - yloc;
				var yadj = ygap / 2;
				var ygap_next = ((Math.pow(2, (i + 1))) * (Math.ceil((j + 1) / 2) + 1)) + (1 - (Math.pow(2, (i + 1)))) - yloc_next;
				var yadj_next = (ygap_next / 2);
				var prot_y = this.settings.height + this.settings.v_spacing;
				var prot_x = this.settings.width + this.settings.h_spacing;

				if (this.settings.logo.active) {
					//prot_x += this.settings.logo.width;
				}

				var dx = (i * prot_x);

				var draw_x = (dx + this.settings.padding);
				var draw_y = ((yloc * prot_y) + (yadj * prot_y) - (prot_y * 1.5)) + this.settings.padding;


				if(draw_y +this.settings.height > group.final_height)
				{
					group.final_height = draw_y +this.settings.height + (this.settings.padding);
				}
				if(draw_x +this.settings.width > group.final_width)
				{
					group.final_width = draw_x +this.settings.width + (this.settings.padding);
				}

				//This is a mess... will tidy later (vaguely tidied now)
				ctx.fillStyle = this.makegrad(ctx, draw_y, this.settings.gradient, this.settings.height);
				ctx.fillRect(draw_x, draw_y, this.settings.width, this.settings.height);
				ctx.strokeRect(draw_x, draw_y, this.settings.width, this.settings.height);

				//draw logo if active
				if (this.settings.logo.active) {
					logo_store[j] = {};
					logo_store[j].func = new Image();
					logo_store[j].func.settings = this.settings.logo;
					logo_store[j].func.onload = function () {
						ctx.drawImage(this, this.xpos, this.ypos, this.settings.width, this.settings.height)
						if (this.settings.border > 0) {
							ctx.strokeRect(this.xpos + 1, this.ypos, this.settings.width - 1, this.settings.height);
						}
					}
					logo_store[j].func.xpos = draw_x;
					logo_store[j].func.ypos = draw_y;
					logo_store[j].func.j = j;

					if (Math.floor(j / 2) == (j / 2)) {
						if (group.rounds[i].matches[(j / 2)].p1 != null /*&& group.rounds[i].matches[(j / 2)].p1.logo != null*/) {
							let player = this.getPlayerById(group.rounds[i].matches[(j / 2)].p1.id);
							if(player){

								//console.log('draw p1 image');
								//console.log(player.image);
								ctx.drawImage(player.image, draw_x, draw_y, this.settings.logo.width, this.settings.logo.height);
							}else ctx.drawImage(this.defaultPlayerImage, draw_x, draw_y, this.settings.logo.width, this.settings.logo.height);
						} else {
							logo_store[j].func.src = this.settings.logo.default_image;
						}
					} else {
						if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null /*&& group.rounds[i].matches[Math.floor(j / 2)].p2.logo != null*/) {
							//logo_store[j].func.src = group.rounds[i].matches[Math.floor(j / 2)].p2.logo;

							let player = this.getPlayerById(group.rounds[i].matches[Math.floor(j / 2)].p2.id);

							if(player) {
								//console.log('draw p2 image');
								ctx.drawImage(player.image, draw_x, draw_y, this.settings.logo.width, this.settings.logo.height);
							}else ctx.drawImage(this.defaultPlayerImage, draw_x, draw_y, this.settings.logo.width, this.settings.logo.height);
						} else {
							logo_store[j].func.src = this.settings.logo.default_image;
						}
					}
					if (this.settings.logo.border > 0) {
						ctx.strokeRect(draw_x + 1, draw_y, this.settings.width - 1, this.settings.height);
					}
				}

				//writescore if active
				if (this.settings.score.active) {

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
							ctx.fillText(group.rounds[i].matches[(j / 2)].p1.score, (draw_x + this.settings.width - this.settings.score.padding), draw_y + (half_height - 8));
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
							ctx.fillText(group.rounds[i].matches[Math.floor(j / 2)].p2.score, (draw_x + this.settings.width - this.settings.score.padding), draw_y + (half_height - 8));
						}
					}
					ctx.fillStyle = this.settings.text_color;
				}

				//draw border if needed
				if (this.settings.border_width > 0) {
					ctx.strokeRect(draw_x, draw_y, this.settings.width, this.settings.height);
				}

				//if last round draw winner cell
				if (i == (group.rounds.length - 1) && false) {
					if (this.settings.logo.active) {

						logo_store[j + 1] = {};
						logo_store[j + 1].func = new Image();
						logo_store[j + 1].func.settings = this.settings.logo;
						logo_store[j + 1].func.onload = function () {
							ctx.drawImage(this, this.xpos, this.ypos)
							if (this.settings.border > 0) {
								ctx.strokeRect(this.xpos + 1, this.ypos, this.settings.width - 1, this.settings.height);
							}
						}
						logo_store[j + 1].func.xpos = (((i + 1) * prot_x));
						logo_store[j + 1].func.ypos = (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5);


						if (group.rounds[i].matches[0].winner == 1) {
							logo_store[j + 1].func.src = group.rounds[i].matches[0].p1.logo;
						} else if (group.rounds[i].matches[0].winner == 2) {
							logo_store[j + 1].func.src = group.rounds[i].matches[0].p2.logo;
						} else {
							logo_store[j + 1].func.src = this.settings.logo.default_image;
						}

					}
					ctx.fillStyle = this.makegrad(ctx, (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5), this.settings.gradient, this.settings.height);
					ctx.fillRect((((i + 1) * prot_x) + this.x_adjustment), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5), this.settings.width, this.settings.height);
					//draw border if needed
					if (this.settings.border_width > 0) {
						ctx.strokeRect((((i + 1) * prot_x) + this.x_adjustment), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5), this.settings.width, this.settings.height);
					}
					if (group.rounds[i].matches[0].winner == 1) {
						ctx.fillStyle = this.settings.text_color;
						ctx.fillText(group.rounds[i].matches[0].p1.name, ((((i + 1) * prot_x) + 5) + this.x_adjustment), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + (half_height - 8));
					}
					if (group.rounds[i].matches[0].winner == 2) {
						ctx.fillStyle = this.settings.text_color;
						ctx.fillText(group.rounds[i].matches[0].p2.name, ((((i + 1) * prot_x) + 5) + this.x_adjustment), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + (half_height - 8));
					}
				}

				
				//set bracket options
				ctx.strokeStyle = this.settings.bracket_color;
				ctx.lineWidth = this.settings.bracket_width;

				if(i < group.rounds.length - 1) 
				{
					//draw them brakets
					ctx.beginPath();

					//move to right middle of element just dawn
					ctx.moveTo(((dx + this.settings.width) + this.settings.padding), draw_y + half_height);

					// draw horizontal line to 1/2 of h_spacing
					ctx.lineTo(((dx + this.settings.width + (this.settings.h_spacing / 2)) + this.settings.padding), draw_y + half_height);

					//draw vertical line to y of the middle of the next element
					ctx.lineTo(((dx + this.settings.width + (this.settings.h_spacing / 2)) + this.settings.padding), ((yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.padding));

					//draw horizontal to next element
					ctx.lineTo(((dx + prot_x) + this.settings.padding), (yloc_next * prot_y) + (yadj_next * prot_y) - (prot_y * 1.5) + half_height + this.settings.padding);
					ctx.stroke();
				}

				//reset strokes in case you have different borders
				ctx.strokeStyle = this.settings.border_color;
				ctx.lineWidth = this.settings.border_width;

				//evens or odds I could use mods I think but I'm only a simple bear
				if (Math.floor(j / 2) == (j / 2)) {

					//if player has a name...
					if (group.rounds[i].matches[(j / 2)].p1 != null) {

						//...set fill style to text color...
						ctx.fillStyle = this.settings.text_color;

						//...and the match has been played...
						if (group.rounds[i].matches[(j / 2)].winner != null) {

							//...and this poor fella has lost...
							if (group.rounds[i].matches[(j / 2)].winner == 2) {

								//...set the fill style to looser color...
								ctx.fillStyle = this.settings.text_color_loss;
							}
						}

						let name = group.rounds[i].matches[(j / 2)].p1.name;
						if(group.offsets.flip)
							name = name.split('').reverse().join('');
						//...then write the NAME!
						ctx.fillText(name, ((draw_x + 5) + this.x_adjustment), draw_y + (half_height - 8));
					}
				} else {

					//do the same thing for again for player two
					if (group.rounds[i].matches[Math.floor(j / 2)].p2 != null) {
						ctx.fillStyle = this.settings.text_color;
						if (group.rounds[i].matches[Math.floor(j / 2)].winner != null) {
							if (group.rounds[i].matches[Math.floor(j / 2)].winner == 1) {
								ctx.fillStyle = this.settings.text_color_loss;
							}
						}
						let name = group.rounds[i].matches[Math.floor(j / 2)].p2.name;
						if(group.offsets.flip)
							name = name.split('').reverse().join('');
						ctx.fillText(name, ((draw_x + 5) + this.x_adjustment), draw_y + (half_height - 8));


					}
				}
			}
		}
	}
}
