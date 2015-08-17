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
loader.load("bgimg", "img/bgimg.png");
loader.ready(updatePreview);

function getPixelsPerUnit (unit) {
	if (!unit) unit = "mm";
	var elem = document.createElement("div");
	elem.style.visibility = "hidden";
	elem.style.width      = "100" + unit;
	elem.style.height     = "100" + unit;
	elem.style.border     = "none";
	elem.style.padding    = "0";
	elem.style.position   = "absolute";
	elem.style.left       = "0";
	elem.style.top        = "0";
	document.body.appendChild(elem);
	// offsetHeight is an integer, so to get a more precise
	//  valueI use 100 units and then devide by 100
	var pixels = elem.offsetHeight / 100;
	document.body.removeChild(elem);
	if (window.devicePixelRatio) {
		pixels *= window.devicePixelRatio;
	}
	return pixels;
}

function parseSize (size) {
	var m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)([a-z]*)$/.exec(size);

	return {
		width:  parseFloat(m[1]),
		height: parseFloat(m[2]),
		unit:   m[3]||'mm'
	};
}

function getBadgeParams () {
	var size = parseSize($('#size').val());

	return {
		username:   $('#username').val().trim(),
		link:       $('#link').val().trim(),
		qrcode:     $('#qrcode').prop('checked'),
		border:     $('#border').prop('checked'),
		width:      size.width,
		height:     size.height,
		unit:       size.unit,
		dpi:        parseInt($('#dpi').val(), 10)
	};
}

function drawBadge (canvas, options) {
	var width     = options.width;
	var height    = options.height;
	var pixWidth  = Math.floor(width  * options.dpu);
	var pixHeight = Math.floor(height * options.dpu);

	canvas.width  = pixWidth;
	canvas.height = pixHeight;

	var ctx = canvas.getContext("2d");

	ctx.imageSmoothingEnabled = true;

	ctx.lineCap = 'square';
	ctx.lineJoin = 'miter';
	ctx.textBaseline = 'top';
	ctx.textAlign = "right";

	var img = loader.get("bgimg");
	var imgAspect   = img.width / img.height;
	var badgeAspect = width / height;
	var qrSize      = Math.round(pixHeight * 0.3);
	var margin      = pixHeight * 0.05;
	var imgWidth, imgHeight, unSize, lnkSize, unTop, lnkTop, txtX;

	if (imgAspect < badgeAspect) {
		imgWidth  = pixWidth;
		imgHeight = pixWidth / imgAspect;
	}
	else {
		imgWidth  = pixHeight * imgAspect;
		imgHeight = pixHeight;
	}

	var txtX     = pixWidth * 0.4;
	var txtWidth = txtX - margin;
	var unSize   = pixHeight * 0.1;
	var lnkSize  = pixHeight * (options.username ? 0.06 : 0.1);
	var unTop    = pixHeight * (options.link     ? 0.55 : 0.6);
	var lnkTop   = pixHeight * (options.username ? 0.7  : 0.6);
	var shadowOffset = pixHeight * 0.002;
	var textStyle    = '#FFFFFF';
	var shadowStyle  = 'rgba(0,0,0,0.5)';
	var actualTxtWidth = 0;

	if (options.username) {
		ctx.font = unSize + 'px "Hamburger Heaven"';
		actualTxtWidth = ctx.measureText(options.username).width;
	}
	
	if (options.username) {
		ctx.font = lnkSize + 'px "Hamburger Heaven"';
		actualTxtWidth = Math.max(actualTxtWidth, ctx.measureText(options.link).width);
	}

	if (actualTxtWidth > txtWidth) {
		txtX     = Math.min(margin + actualTxtWidth, options.qrcode ? pixWidth - qrSize - margin * 2 : pixWidth - margin);
		txtWidth = txtX - margin;
	}

	ctx.drawImage(img, pixWidth / 2 - imgWidth / 2, pixHeight / 2 - imgHeight / 2, imgWidth, imgHeight);

	if (options.username) {
		ctx.font = unSize + 'px "Hamburger Heaven"';
		shadowText(ctx, options.username, txtX, unTop, shadowOffset, txtWidth, textStyle, shadowStyle);
	}

	if (options.link) {
		ctx.font = lnkSize + 'px "Hamburger Heaven"';
		shadowText(ctx, options.link, txtX, lnkTop, shadowOffset, txtWidth, textStyle, shadowStyle);
	}

	if (options.qrcode) {
		ctx.imageSmoothingEnabled = false;
		$(canvas).qrcode({
			text: autoUrl(options.link || 'http://www.thegeekfleet.com/'),
			size: qrSize,
			left: pixWidth  - qrSize - margin,
			top:  pixHeight * 0.52,
			background: '#FFFFFF'
		});
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

function shadowText (ctx, text, x, y, shadowOffset, maxWidth, textStyle, shadowStyle) {
	ctx.fillStyle = shadowStyle;
	ctx.fillText(text, x + shadowOffset, y + shadowOffset, maxWidth);

	ctx.fillStyle = textStyle;
	ctx.fillText(text, x, y, maxWidth);
}

function equalState (s1, s2) {
	return s1.username === s2.username &&
	       s1.dpi    === s2.dpi &&
	       s1.width  === s2.width &&
	       s1.height === s2.height &&
	       s1.border === s2.border &&
	       s1.link === s2.link &&
	       s1.qrcode === s2.qrcode;
}

function _updatePreview (params) {
	var $canvas = $('#preview_badge');
	drawBadge($canvas[0], $.extend({dpu: getPixelsPerUnit(params.unit)}, params));

	if (params.border) {
		$(document.body).addClass('show-border');
	}
	else {
		$(document.body).removeClass('show-border');
	}

	$canvas.css({
		width:  params.width+params.unit,
		height: params.height+params.unit
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
				size:       params.width + 'x' + params.height + params.unit,
				border:     params.border
			}));
		}
	}
	lastState = params;
}

var lastState = {username:'',dpi:200,width:105,height:74};

var DPI_CONV = {
	"mm": 25.4,
	"cm":  2.54,
	"in":  1,
	"pt": 72,
	"pc":  6
};

function dpiToUnit (dpi, unit) {
	return dpi / DPI_CONV[unit];
}

function downloadBadge () {
	var params = getBadgeParams();
	var canvas = document.createElement("canvas");
	var filename = "g33kfl33t_badge.png";
	var fileformat = "image/png";
	drawBadge(canvas, $.extend({dpu: dpiToUnit(params.dpi, params.unit)}, params));
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
	drawBadge(canvas, $.extend({dpu: dpiToUnit(params.dpi, params.unit)}, params));
	$badge.css({
		width:  params.width+params.unit,
		height: params.height+params.unit
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

	$("#username").val((params.username||'').trim()).on('keyup cut paste drop', defer(updatePreview));
	$("#link").val(params.link||'').on('keyup cut paste drop', defer(updatePreview));
	$("#username, #size, #dpi, #border, #qrcode").change(updatePreview);
	if (params.size) {
		var $size = $("#size").val(params.size);
		if (!$size.val()) {
			var size = parseSize(params.size);
			$('#custom_sizes').append($('<option>',{value: params.size}).text(size.width + ' × ' + size.height + ' ' + size.unit)).show();
			$size.val(params.size);
		}
	}
	if (params.dpi) $("#dpi").val(params.dpi);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#qrcode").prop('checked', 'qrcode' in params ? parseBool(params.qrcode) : true);
});

$(window).on('popstate', function (event) {
	var params = event.originalEvent.state;
	if (!params) {
		params = parseParams(location.search.replace(/^\?/,''));
	}
	params.link = (params.link||'').trim();
	if (!params.unit) params.unit = 'mm';

	$("#username").val((params.username||'').trim());
	$("#link").val(params.link||'');
	var $size = $("#size").val(params.width + 'x' + params.height + params.unit);
	if (!$size.val()) $size.val('105x74mm');
	$("#dpi").val(params.dpi||200);
	$("#border").prop('checked', 'border' in params ? parseBool(params.border) : true);
	$("#qrcode").prop('checked', 'qrcode' in params ? parseBool(params.qrcode) : true);

	_updatePreview(params);
});
