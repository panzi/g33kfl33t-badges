if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
	};
}

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
loader.load("raccoon", "img/raccoon.png");
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
	if (window.devicePixelRatio) {
		pixels *= window.devicePixelRatio;
	}
	return pixels;
}

function getBadgeParams () {
	var format = $('#format').val().split('x');

	return {
		username:   $('#username').val(),
		link:       $('#link').val().trim(),
		qrcode:     $('#qrcode').prop('checked'),
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

	ctx.imageSmoothingEnabled = true;
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

	ctx.lineCap = 'square';
	ctx.lineJoin = 'miter';
	ctx.textBaseline = 'top';
	ctx.textAlign = "center";

	ctx.fillStyle   = '#FFF000';
	ctx.strokeStyle = '#000000';

	var img = loader.get("raccoon");
	var imgHeight, imgTop, hSize, hTop, hWidth;
	var qrSize, qrMargin;
	var unMid, unWidth, unSize, lnkSize, unLine, lnkLine, unTop, lnkTop;

	if (options.link || options.username) {
		imgHeight = pixHeight * 0.25;
		imgTop    = pixHeight * 0.098;
		hSize     = pixHeight * 0.15;
		hWidth    = pixWidth  * 0.7;
		hTop      = pixHeight * 0.34;
	}
	else {
		imgHeight = pixHeight * 0.32;
		imgTop    = pixHeight * 0.22;
		hSize     = pixHeight * 0.2;
		hWidth    = pixWidth  * 0.9;
		hTop      = pixHeight * 0.52;
	}
	var imgWidth = imgHeight * img.width / img.height;

	if (options.link && options.qrcode) {
		qrSize   = Math.round(pixHeight * 0.4);
		qrMargin = pixHeight * 0.05;
		var availWidth = pixWidth - qrMargin - qrSize;
		unMid    = availWidth / 2;
		unWidth  = availWidth * 0.9;
		unSize   = pixHeight * 0.06;
		lnkSize  = pixHeight * (options.username ? 0.05 : 0.06);
		unLine   = pixHeight * 0.025;
		lnkLine  = pixHeight * 0.02;
		unTop    = pixHeight * 0.68;
		lnkTop   = pixHeight * (options.username ? 0.8 : 0.72);
	}
	else {
		unMid   = pixWidth / 2;
		unWidth = pixWidth * 0.9;
		unSize  = pixHeight * 0.1;
		lnkSize = pixHeight * (options.username ? 0.06 : 0.1);
		unLine  = pixHeight * 0.03;
		lnkLine = pixHeight * 0.025;
		unTop   = pixHeight * (options.link ? 0.6 : 0.7);
		lnkTop  = pixHeight * (options.username ? 0.78 : 0.7);
	}

	ctx.font = hSize + 'px "Press Start 2P"';
	ctx.lineWidth = Math.round(pixHeight * 0.04);
	outlineText(ctx, '#TEAMHOOMAN', pixWidth / 2, hTop, hWidth);

	ctx.drawImage(img, pixWidth / 2 - imgWidth / 2, imgTop, imgWidth, imgHeight);

	if (options.username) {
		ctx.font = unSize + 'px "Press Start 2P"';
		ctx.lineWidth = unLine;
		outlineText(ctx, options.username, unMid, unTop, unWidth);
	}

	if (options.link) {
		ctx.font = lnkSize + 'px "Press Start 2P"';
		ctx.lineWidth = lnkLine;
		outlineText(ctx, options.link, unMid, lnkTop, unWidth);
		
		if (options.qrcode) {
			ctx.imageSmoothingEnabled = false;
			$(canvas).qrcode({
				text: autoUrl(options.link),
				size: qrSize,
				left: pixWidth  - qrSize - qrMargin,
				top:  pixHeight - qrSize - qrMargin,
				background: '#FFFFFF'
			});
		}
	}
}

function autoUrl (url) {
	if (!/^[_a-z][-_a-z0-9]*:/i.test(url)) {
		if (/^@/.test(url)) {
			return 'https://twitter.com/'+url.substring(1);
		}
		else if (/^[^\/@\s:]+@[^\/@\s:]+$/.test(url)) {
			return 'mailto:'+url;
		}
		else if (/^[a-z0-9]\w+$/i.test(url)) {
			return 'http://www.twitch.tv/'+url;
		}
		else {
			return 'http://'+url;
		}
	}
	return url;
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
	       s1.link === s2.link &&
	       s1.qrcode === s2.qrcode;
}

function _updatePreview (params) {
	var $canvas = $('#preview_badge');
	drawBadge($canvas[0], $.extend({dpmm: getPixelsPerUnit('mm')}, params));

	if (params.border) {
		$(document.body).addClass('show-border');
	}
	else {
		$(document.body).removeClass('show-border');
	}

	$canvas.css({
		width:  params.width+'mm',
		height: params.height+'mm'
	});
}

function updatePreview (forceUpdate) {
	var params = getBadgeParams();
	var changed = !equalState(params, lastState);
	if (changed || forceUpdate) {
		_updatePreview(params);

		if (changed && history.pushState) {
			history.pushState(params, document.title, location.pathname+"?"+$.param({
				username:   params.username,
				link:       params.link,
				qrcode:     params.qrcode,
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
	var filename = "teamhooman_badge.png";
	var fileformat = "image/png";
	drawBadge(canvas, $.extend({dpmm: params.dpi / MM_PER_INCH}, params));
	saveCanvas(canvas, filename, fileformat);
}

window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
window.saveAs = window.saveAs || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs;

function saveCanvas (canvas, filename, fileformat) {
	if (navigator.msSaveBlob || window.URL || window.saveAs) {
		if (canvas.toBlob) {
			canvas.toBlob(function (blob) {
				saveBlob(blob, filename);
			}, fileformat);
		}
		else {
			saveBlob(dataURLToBlob(canvas.toDataURL(fileformat)), filename);
		}
	}
	else {
		saveUrl(canvas.toDataURL(fileformat), filename);
	}
}

function dataURLToBlob (dataURL) {
	var index = dataURL.indexOf(',');
	var meta = dataURL.substring(0, index);
	var data = dataURL.substring(index + 1);
	var contentType = meta.substring(meta.indexOf(':') + 1);

	if (/;base64$/.test(contentType)) {
		contentType = contentType.substring(0, contentType.length - 7);
		var strdata = atob(data);

		data = new Uint8Array(strdata.length);

		for (var i = 0; i < strdata.length; ++ i) {
			data[i] = strdata.charCodeAt(i);
		}
	}
	else {
		data = decodeURIComponent(data);
	}

	return new Blob([data], {type: contentType});
}

function saveBlob (blob, filename) {
	if (navigator.msSaveBlob) {
		navigator.msSaveBlob(blob, filename);
	}
	else if (window.saveAs) {
		window.saveAs(blob, filename);
	}
	else {
		var url = window.URL.createObjectURL(blob);

		saveUrl(url, filename);

		setTimeout(function () {
			window.URL.revokeObjectURL(url);
		}, 250);
	}
}

function saveUrl (url, filename) {
	var link = document.createElement("a");
	if ('download' in link) {
		link.download = filename;
		link.href = url;
		link.style.position = 'absolute';
		link.style.left = '0';
		link.style.top = '0';

		// some browsers need it to be in the document
		document.body.appendChild(link);
		link.click();

		setTimeout(function () {
			document.body.removeChild(link);
		}, 250);
	}
	else {
		// async callback -> window.open() will fail
		window.location = url;
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
			params[decodeURIComponent(p[0].replace(/\+/g,' '))] = decodeURIComponent(p.slice(1).join("=").replace(/\+/g,' '));
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
		// for /?foo=true some browsers sometimes "fix" the url to /?foo=true/
		return val.toLowerCase().replace(/\/+$/,'') === "true";
	}
}

$(document).ready(function ($) {
	var params = parseParams(location.search.replace(/^\?/,''));

	params.link = (params.link||'').trim();
	$("#badge_form").submit(downloadBadge);

	$("#username").val(params.username||'').on('keyup cut paste drop', defer(updatePreview));
	$("#link").val(params.link||'').on('keyup cut paste drop', defer(updatePreview));
	$("#username, #format, #dpi, #border, #background, #qrcode").change(updatePreview);
	if (params.format) $("#format").val(params.format);
	if (params.dpi) $("#dpi").val(params.dpi);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#background").prop('checked', 'background' in params ? parseBool(params.background) : true);
	$("#qrcode").prop('checked', 'qrcode' in params ? parseBool(params.qrcode) : true);
});

$(window).on('popstate', function (event) {
	var params = event.originalEvent.state;
	if (!params) {
		params = parseParams(location.search.replace(/^\?/,''));
	}
	params.link = (params.link||'').trim();

	$("#username").val(params.username||'');
	$("#link").val(params.link||'');
	var $format = $("#format").val(params.width + 'x' + params.height);
	if (!$format.val()) $format.val('105x74');
	$("#dpi").val(params.dpi||200);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#background").prop('checked', 'background' in params ? parseBool(params.background) : true);
	$("#qrcode").prop('checked', 'qrcode' in params ? parseBool(params.qrcode) : true);

	_updatePreview(params);
});
