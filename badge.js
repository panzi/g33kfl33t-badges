function Loader () {
	this._resources = {};
	this._callbacks = [];
	this._count = 0;
	this._ready = 0;
}

Loader.Doc = function () {
	var self = this;
	this.resource = document;
	$(document).ready(function () {
		if (self.onload) self.onload.call(self);
	});
};

Loader.Image = function (src) {
	var self = this;
	var img = new Image();
	var loader = this;
	this.resource = img;
	img.src = src;
	img.onload = function () {
		if (self.onload) self.onload.call(self);
	};
	img.onerror = function () {
		if (self.onerror) self.onerror.call(self);
	};
};

Loader.prototype = {
	load: function (name, res) {
		if (name in this._resources) {
			throw new Error("name already in use: "+name);
		}

		if (typeof res === "string") {
			res = new Loader.Image(res);
		}
		else if (res === document) {
			res = new Loader.Doc();
		}

		var lader = this;
		res.ready = false;
		res.onload = function () {
			res.ready = true;
			loader._ready ++;
			loader._fire_if_ready();
		};
		// TODO: error handling?
		this._resources[name] = res;
		this._count ++;
	},
	ready: function (callback) {
		if (this.isReady()) {
			callback.call(this);
		}
		else {
			this._callbacks.push(callback);	
		}
	},
	_fire_if_ready: function () {
		if (this.isReady()) {
			for (var i = 0; i < this._callbacks.length; ++ i) {
				this._callbacks[i].call(this);
			}
			this._callbacks = [];
		}
	},
	get: function (name) {
		var res = this._resources[name];
		return res ? res.resource : null;
	},
	isReady: function () {
		return this._ready === this._count;
	}
};

var loader = new Loader();
loader.load("document", document);
loader.load("gandsHoomans", "gandsHoomans.png");
loader.ready(updatePreview);

function getPixelsPerUnit (unit) {
	if (!unit) unit = "mm";
	var elem = document.createElement("div");
	elem.style.visibility = "hidden";
	elem.style.width      = "1" + unit;
	elem.style.height     = "1" + unit;
	elem.style.border     = "none";
	elem.style.padding    = "0";
	elem.style.position   = "absolute";
	elem.style.left       = "0";
	elem.style.top        = "0";
	document.body.appendChild(elem);
	var pixels = elem.offsetHeight;
	document.body.removeChild(elem);
	return pixels;
}

function getBadgeParams () {
	var format = $('#format').val().split('x');

	return {
		username: $('#username').val(),
		border: $('#border').prop('checked'),
		width:  parseInt(format[0], 10),
		height: parseInt(format[1], 10),
		dpi:    parseInt($('#dpi').val(), 10)
	};
}

function drawBadge (canvas, username, width, height, dpmm) {
	var pixWidth  = Math.floor(width  * dpmm);
	var pixHeight = Math.floor(height * dpmm);

	canvas.width  = pixWidth;
	canvas.height = pixHeight;

	var ctx = canvas.getContext("2d");
	ctx.fillStyle = '#FFFFFF';
	ctx.fillRect(0, 0, pixWidth, pixHeight);

//	ctx.imageSmoothingEnabled = false;
	ctx.lineCap = 'square';
	ctx.lineJoin = 'miter';
	ctx.textBaseline = 'top';
	ctx.textAlign = "center";

	ctx.fillStyle   = '#FFF000';
	ctx.strokeStyle = '#000000';

	ctx.font = (pixHeight * 0.17) + 'px "Press Start 2P"';
	ctx.lineWidth = Math.round(pixHeight * 0.05);
	outlineText(ctx, '#TEAMHOOMAN', pixWidth / 2, pixHeight * 0.38, pixWidth * 0.8);

	var img = loader.get("gandsHoomans");
	var imgSize = pixHeight * 0.35;
//	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(img, pixWidth / 2 - imgSize / 2, pixHeight * 0.05, imgSize, imgSize);
//	ctx.imageSmoothingEnabled = false;

	ctx.font = (pixHeight * 0.1) + 'px "Press Start 2P"';
	ctx.lineWidth = Math.round(pixHeight * 0.03);
	outlineText(ctx, username, pixWidth / 2, pixHeight * 0.7, pixWidth * 0.9);
}

function outlineText (ctx, text, x, y, maxWidth) {
	ctx.strokeText(text, x, y, maxWidth);
	ctx.fillText(text, x, y, maxWidth);
}

function equalState (s1, s2) {
	return s1.username === s2.username &&
	       s1.dpi    === s2.dpi &&
	       s1.width  === s2.width &&
	       s1.height === s2.height &&
	       s1.border === s2.border;
}

function updatePreview (forceUpdate) {
	var params = getBadgeParams();
	var changed = !equalState(params, lastState);
	if (changed || forceUpdate) {
		var canvas = $('#preview_badge')[0];
		drawBadge(canvas, params.username, params.width, params.height, getPixelsPerUnit('mm'));

		if (params.border) {
			$(document.body).addClass('show-border');
		}
		else {
			$(document.body).removeClass('show-border');
		}

		if (changed && history.pushState) {
			history.pushState(params, document.title, "?"+$.param({
				username: params.username,
				dpi:      params.dpi,
				format:   params.width + 'x' + params.height,
				border:   params.border
			}));
		}
	}
	lastState = params;
}

var lastState = {username:'',dpi:200,width:105,height:74};
var MM_PER_INCH = 25.4;

function downloadBadge () {
	var params = getBadgeParams();
	var canvas = document.createElement("canvas");
	var link = document.createElement("a");
	link.download = "teamhooman_badge.png";
	drawBadge(canvas, params.username, params.width, params.height, params.dpi / MM_PER_INCH);

	if (canvas.toBlob) {
		canvas.toBlob(function (blob) {
			var URL = window.URL || window.webkitURL;
			var url = URL.createObjectURL(blob);

			link.href = url;
			link.click();

			setTimeout(function () {
				URL.revokeObjectURL(url);
			}, 250);
		});
	}
	else {
		link.href = canvas.toDataURL();
		link.click();
	}
}

function defer (f) {
	return function () {
		var self = this;
		var args = arguments;
		setTimeout(function () { f.apply(self,args); }, 0);
	};
}

function parseParams (qs) {
	var params = {};
	if (qs) {
		var qs = qs.split("&");
		for (var i = 0; i < qs.length; ++ i) {
			var p = qs[i].split("=");
			params[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join("="));
		}
	}
	return params;
}

function printBadge () {
	var params = getBadgeParams();
	var $badge = $("#print_badge");
	var canvas = $badge[0];
	drawBadge(canvas, params.username, params.width, params.height, params.dpi / MM_PER_INCH);
	$badge.css({
		width:  params.width+'mm',
		height: params.height+'mm'
	});
	window.print();
}

function parseBool (val) {
	if (typeof val === "boolean") {
		return val;
	}
	else {
		return val.toLowerCase() === "true";
	}
}

$(document).ready(function ($) {
	var params = parseParams(location.search.replace(/^\?/,''));

	$("#badge_form").submit(downloadBadge);
	
	$("#username").val(params.username||'').keyup(defer(updatePreview));
	$("#username, #format, #dpi, #border").change(updatePreview);
	if (params.format) $("#format").val(params.format);
	if (params.dpi) $("#dpi").val(params.dpi);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
});

$(window).on('popstate', function (event) {
	var state = event.originalEvent.state;
	if (!state) {
		state = parseParams(location.search.replace(/^\?/,''));
	}
	$("#username").val(state.username||'');
	var $format = $("#format").val(state.width + 'x' + state.height);
	if (!$format.val()) $format.val('105x74');
	$("#dpi").val(state.dpi||200);
	$("#border").prop('checked', 'border' in state ? parseBool(state.border) : true);
	
	var canvas = $('#preview_badge')[0];
	drawBadge(canvas, state.username, state.width, state.height, getPixelsPerUnit('mm'));
});
