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
		username:   $('#username').val(),
		link:       $('#link').val(),
		border:     $('#border').prop('checked'),
		background: $('#background').prop('checked'),
		width:      parseInt(format[0], 10),
		height:     parseInt(format[1], 10),
		dpi:        parseInt($('#dpi').val(), 10)
	};
}

function drawBadge (canvas, options) {
	var width     = options.width;
	var height    = options.height;
	var pixWidth  = Math.floor(width  * options.dpmm);
	var pixHeight = Math.floor(height * options.dpmm);

	canvas.width  = pixWidth;
	canvas.height = pixHeight;

	var ctx = canvas.getContext("2d");

	if (options.background) {
		var gradient = ctx.createRadialGradient(pixWidth/2, 0, 0, pixWidth/2, 0, pixHeight);
		gradient.addColorStop(0,"white");
		gradient.addColorStop(1,"#ADF0FF");
		ctx.fillStyle = gradient;
		ctx.fillRect(0,0,pixWidth,pixWidth);
	}
	else {
		ctx.fillStyle = '#FFFFFF';
		ctx.fillRect(0, 0, pixWidth, pixHeight);
	}

//	ctx.imageSmoothingEnabled = false;
	ctx.lineCap = 'square';
	ctx.lineJoin = 'miter';
	ctx.textBaseline = 'top';
	ctx.textAlign = "center";

	ctx.fillStyle   = '#FFF000';
	ctx.strokeStyle = '#000000';

	ctx.font = (pixHeight * 0.14) + 'px "Press Start 2P"';
	ctx.lineWidth = Math.round(pixHeight * 0.05);
	outlineText(ctx, '#TEAMHOOMAN', pixWidth / 2, pixHeight * 0.34, pixWidth * 0.7);

	var img = loader.get("gandsHoomans");
	var imgSize = pixHeight * 0.3;
//	ctx.imageSmoothingEnabled = true;
	ctx.drawImage(img, pixWidth / 2 - imgSize / 2, pixHeight * 0.05, imgSize, imgSize);
//	ctx.imageSmoothingEnabled = false;

	ctx.font = (pixHeight * 0.1) + 'px "Press Start 2P"';
	ctx.lineWidth = Math.round(pixHeight * 0.03);
	outlineText(ctx, options.username, pixWidth / 2, pixHeight * (options.link ? 0.6 : 0.7), pixWidth * 0.9);

	if (options.link) {
		ctx.font = (pixHeight * 0.06) + 'px "Press Start 2P"';
		ctx.lineWidth = Math.round(pixHeight * 0.025);
		outlineText(ctx, options.link, pixWidth / 2, pixHeight * 0.78, pixWidth * 0.9);
	}
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
	       s1.border === s2.border &&
	       s1.background === s2.background &&
	       s1.link === s2.link;
}

function updatePreview (forceUpdate) {
	var params = getBadgeParams();
	var changed = !equalState(params, lastState);
	if (changed || forceUpdate) {
		var canvas = $('#preview_badge')[0];
		drawBadge(canvas, $.extend({dpmm: getPixelsPerUnit('mm')}, params));

		if (params.border) {
			$(document.body).addClass('show-border');
		}
		else {
			$(document.body).removeClass('show-border');
		}

		if (changed && history.pushState) {
			history.pushState(params, document.title, "?"+$.param({
				username:   params.username,
				link:       params.link,
				dpi:        params.dpi,
				format:     params.width + 'x' + params.height,
				border:     params.border,
				background: params.background
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
	drawBadge(canvas, $.extend({dpmm: params.dpi / MM_PER_INCH}, params));

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
	drawBadge(canvas, $.extend({dpmm: params.dpi / MM_PER_INCH}, params));
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
	
	$("#username").val(params.username||'').on('keyup cut paste drop', defer(updatePreview));
	$("#link").val(params.link||'').on('keyup cut paste drop', defer(updatePreview));
	$("#username, #format, #dpi, #border, #background").change(updatePreview);
	if (params.format) $("#format").val(params.format);
	if (params.dpi) $("#dpi").val(params.dpi);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#background").prop('checked', 'border' in params ? parseBool(params.background) : true);
});

$(window).on('popstate', function (event) {
	var params = event.originalEvent.state;
	if (!params) {
		params = parseParams(location.search.replace(/^\?/,''));
	}
	$("#username").val(params.username||'');
	$("#link").val(params.link||'');
	var $format = $("#format").val(params.width + 'x' + params.height);
	if (!$format.val()) $format.val('105x74');
	$("#dpi").val(params.dpi||200);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#background").prop('checked', 'border' in params ? parseBool(params.background) : true);
	
	var canvas = $('#preview_badge')[0];
	drawBadge(canvas, $.extend({dpmm: getPixelsPerUnit('mm')}, params));
});
