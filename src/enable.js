/**
 * Copyright (C) 2019 Francesco Fusco. All rights reserved.
 * License: https://github.com/Fushko/font-contrast#license
 */

"use strict";

// Style tag
var style_node;
// Text node
var css_node;

var color = '#cecece'
var bgColor = '#323232'

// svg url replacer {

function getUrlFromBackgroundImageStyle (backgroundImageStyle) {
	return backgroundImageStyle.substring(5, backgroundImageStyle.length - 2);
}

async function getBackgroundUrlData (node) {
	const style = getComputedStyle(node);
	const url = getUrlFromBackgroundImageStyle(style.backgroundImage);
	const res = await fetch(url);
	const text = await res.text();
	return text;
}

function addStyleToSvgStr (svgStr) {
	const insertSvgStyle = `<style type="text/css">*{stroke: ${color}!important;stroke-width: 1px;}</style>`
	return svgStr.replace('</svg>', `${insertSvgStyle}</svg>`);
}

function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function svgStrToDataImage (raw) {
	var encoded = raw.replace(/\s+/g, " ")

	// According to Taylor Hunt, lowercase gzips better ... my tiny test confirms this
	encoded = replaceAll(encoded, "%", "%25");
	encoded = replaceAll(encoded, "> <", "><"); // normalise spaces elements
	encoded = replaceAll(encoded, "; }", ";}"); // normalise spaces css
	encoded = replaceAll(encoded, "<", "%3c");
	encoded = replaceAll(encoded, ">", "%3e");
	encoded = replaceAll(encoded, "\"", "'");
	encoded = replaceAll(encoded, "#", "%23"); // needed for ie and firefox
	encoded = replaceAll(encoded, "{", "%7b");
	encoded = replaceAll(encoded, "}", "%7d");
	encoded = replaceAll(encoded, "|", "%7c");
	encoded = replaceAll(encoded, "^", "%5e");
	encoded = replaceAll(encoded, "`", "%60");
	encoded = replaceAll(encoded, "@", "%40");

	// charset reportedly not needed ... I need to test before implementing
	var uri = 'url("data:image/svg+xml;charset=UTF-8,' + encoded + '")';
	var style = 'background-image: ' + uri + ';';
	return style;
}

function withLog (fn) {
	return (...props) => {
		const result = fn(...props);
		console.log(fn.name, '(', ...props, ') =>');
		console.log(result);
		return result;
	}
}

async function makeBackgroundUrlStyleWithSvg(node) {
	return svgStrToDataImage(
		addStyleToSvgStr(
			await getBackgroundUrlData(node)
		)
	);
}

// svg url replacer }

function getRGBarr(rgba_str) {
	return rgba_str.substring(4, rgba_str.length - 1).split(', ');
}

function getAlfa(rgba_str) {
	const rgbArr = getRGBarr(rgba_str)
	return rgbArr.length === 4
		? parseFloat(rgbArr[3])
		: 1
}

function checkIsRound (node, style = getComputedStyle(node)) {
	const {borderRadius, width, paddingLeft, paddingRight, height, paddingTop, paddingBottom} = style;
	const isPercent = borderRadius.match(/%/);
	const borderRadiusNum = parseFloat(borderRadius);
	let widthNum = 0;
	let heightNum = 0;

	if (width === 'auto' || height === 'auto') {
		widthNum = node.getBoundingClientRect().width;
		heightNum = node.getBoundingClientRect().height;
	} else {
		widthNum = parseInt(paddingLeft) + parseInt(width) + parseInt(paddingRight);
		heightNum = parseInt(paddingTop) + parseInt(height) + parseInt(paddingBottom);
	}
	// const widthNum = width === 'auto'
	// 	? node.getBoundingClientRect().width
	// 	: parseFloat(paddingLeft) + parseFloat(width) + parseFloat(paddingRight);
	// const heightNum = height === 'auto'
	// 	? node.getBoundingClientRect().height
	// 	: parseFloat(paddingTop) + parseFloat(height) + parseFloat(paddingBottom)
	// console.log({isPercent, borderRadiusNum});
	if (isPercent) {
		return borderRadiusNum > 40 && borderRadiusNum < 60
	} else {
		// console.log({widthNum, heightNum});
		return (
			// Math.max(widthNum, heightNum) / Math.min(widthNum, heightNum) < 2 &&
			Math.min(widthNum, heightNum) / borderRadiusNum < 3
		)
	}
}

function calcColorfulness([r, g, b, a = 1]) {
	return Math.abs(r - g) + Math.abs(g - b);
}

function containsText(element) {
	return element.nodeType === Node.TEXT_NODE &&
		/\S/.test(element.nodeValue);
}

function roundTextsInsideRound(node) {
	for (const child of Array.from(node.childNodes)) {
		if (containsText(child)) {
			child.parentNode.setAttribute('rb__', '');
		}
	}
}

function childNodesContainsTextOrSvg(node) {
	const children = Array.from(node.childNodes);
	return children.some(containsText)// || node.getElementsByTagName('svg').length;
}

function isButtonWithoutIcon(node, tag, style = getComputedStyle(node)) {
	return (
		tag === 'BUTTON' &&
		!node.getElementsByTagName('svg').length &&
		!node.getElementsByTagName('img').length &&
		!style.backgroundImage.match(/url\(/)
	)
}

function nlToArr(nl) {
	let arr = [];

	for (let i = 0, len = arr.length = nl.length; i < len; ++i)
		arr[i] = nl[i];

	return arr;
}

function getCSS(cfg, url, bodyId) {
	let host = url.replace('www.', '');
	let additionalCss = ''
	switch (host) {
		case 'vk.com':
			additionalCss = 'svg {z-index: 3;}'
			break;
	}

	const main_white_background = `html, #${bodyId}{background-color:${bgColor}!important;}`;
	const white_background_picked = `#${bodyId} [bg__]{background-color:${bgColor}!important;}`;
	const white_text_background = `#${bodyId} [tbg__]{background-color:${bgColor}!important;}`;
	const delete_gradient_for_background = `#${bodyId} [bg_ig__]{background-image:unset!important;}`;
	const add_box_shadow_for_big_background = `#${bodyId} [bg_bs__]{box-shadow: 0px 0px 0px 0.5px ${color};}`;
	const add_border_color_for_big_background = `#${bodyId} [bg_b__]{border-color: ${color};border-width: 1px;border-style: solid;}`;


	const attr = `#${bodyId}[id] [d__],#${bodyId} [d__] svg, #${bodyId} [bg_us__]`;

	const white_background_for_text = `${attr}{background-color:${bgColor} !important;}`;
	const black_fill = `${attr}{fill:${color} !important;}`;

	let color_black = `color:${color}!important`;

	let dim = '';
	if (cfg.advDimming)
		dim = `${attr}{filter:brightness(${cfg.brightness}%);}`;
	else
		dim = `${attr}{${color_black}}`;

	let opacity = '';
	if (cfg.forceOpacity)
		opacity = '*,*[style]{opacity:1!important}';

	let smartOpacityCss = '';
	if (true) {
		smartOpacityCss = '[o__]{opacity:1!important}';
	}

	let forceColorBlackCss = '';
	if (true) {
		// forceColorBlackCss = `*,*[style]{color:${color}!important}`;
	}

	let forceFilterDropShadowCss = '';
	if (true) {
		forceFilterDropShadowCss = `[src*=".png"], [bg_ut__], [src*="data:image/"], [src*=".svg"] {filter: drop-shadow(0 0 1px ${color});}`;
	}

	let forceBorderColorBlackCss = '';
	let skipForceBorderColorBlackCss = '';
	if (true) {
		forceBorderColorBlackCss = `#${bodyId} *{border-color:${color}!important}`;
		skipForceBorderColorBlackCss = `#${bodyId} [sbc__][border-color:rgba(0,0,0,0)!important]`
	}

	let smartBorderColorBlackCss = '';
	if (true) {
		const sides = ['a', 't', 'r', 'b', 'l'];
		const sideSelector = sides.map(side => `#${bodyId} [bc_${side}__]`).join(',');
		smartBorderColorBlackCss = `${sideSelector}{border-color:${color}!important}`;
	}


	let forceBeforeAfterBlackAndWhiteCss = '';
	if (true) {
		forceBeforeAfterBlackAndWhiteCss = `#${bodyId} :before,#${bodyId} :after{color:${color}!important;filter: drop-shadow(0 0 1px ${color});}`
	}

	let forceSvgBlackAndWhiteCss = '';
	if (true) {
		forceSvgBlackAndWhiteCss = `#${bodyId} svg, #${bodyId} svg *{stroke:${color};}`
	}

	let whiteBackground = '';
	// if (true)
	// 	whiteBackground = `*,*[style]{background-color:${bgColor}!important}`;

	let bold = '';
	if (cfg.boldText)
		bold = '*{font-weight:bold!important}';

	let underline = '';
	if (cfg.underlineLinks)
		underline = '[u__]{text-decoration:underline!important}';

	if (!cfg.forcePlhdr)
		color_black = '';

	const placeholder = `::placeholder{opacity:1!important;${color_black}}`;

	// Doesn't hurt to put it in, even if form borders are disabled
	const form_border = '[b__]{border:1px solid black!important}';

	let size_inc = '';

	if (cfg.size > 0) {
		let c = 1;
		while (c <= cfg.threshold)
			size_inc += `[s__='${c}']{font-size: calc(${c++}px + ${cfg.size}%)!important}\n`;
	}

	const roundBordersCss = '[r__] [d__]{border-radius: inherit;}';
	const roundBackgroundCss = `#${bodyId}[id] [r__]{background-color: ${bgColor}!important}`;

	return [
		roundBordersCss,
		roundBackgroundCss,
		forceColorBlackCss,
		// forceBorderColorBlackCss,
		// skipForceBorderColorBlackCss,
		smartBorderColorBlackCss,
		forceFilterDropShadowCss,
		forceSvgBlackAndWhiteCss,
		forceBeforeAfterBlackAndWhiteCss,
    // white_background_for_text,
    dim,
		main_white_background,
    whiteBackground,
		white_text_background,
    white_background_picked,
    delete_gradient_for_background,
    add_box_shadow_for_big_background,
    add_border_color_for_big_background,
		smartOpacityCss,
    // black_fill,
    opacity,
    size_inc,
    bold,
    placeholder,
    form_border,
    underline,
    additionalCss,
	].join('');
}

function createStyleNode() {
	const doc = document;

	style_node = doc.createElement('style');
	style_node.setAttribute('id', '_fc_');
	doc.head.appendChild(style_node);

	css_node = doc.createTextNode('');
}

async function init() {
	document.body.querySelectorAll('[bg_us__]')
		.forEach(node => {
			node.setAttribute('style', node.getAttribute('style_backup'));
		});
	if (document.getElementById('_fc_')) {
		style_node.appendChild(css_node);
		return;
	}

	createStyleNode();

	const stored = [
		'whitelist',
		'globalStr',
		'size',
		'sizeThreshold',
		'skipColoreds',
		'skipHeadings',
		'advDimming',
		'brightness',
		'boldText',
		'forceOpacity',
		'forcePlhdr',
		'skipWhites',
		'underlineLinks',
		'input_border'
	];

	let cfg = await new Promise(res => chrome.storage.local.get(stored, res));

	cfg.strength  = cfg.globalStr;
	cfg.threshold = cfg.sizeThreshold;

	const url = window.location.hostname || window.location.href;

	const wl  = cfg.whitelist || [];
	const idx = wl.findIndex(x => x.url === url);

	if (idx > -1)
		cfg = wl[idx];

	start(cfg, url);
}

function start(cfg, url) {


	let bodyId = document.body.getAttribute('id') || 'bid__';
	css_node.nodeValue = getCSS(cfg, url, bodyId);

	const nodes = nlToArr(document.body.getElementsByTagName('*'));
	// document.body.setAttribute('bg__', '');

	document.body.setAttribute('id', bodyId);

	const globalTagsToSkip = [
		'SCRIPT',
		'LINK',
		'STYLE',
		'VIDEO',
		'SOURCE',
		'CANVAS',
		'undefined',
	];

	const textTagsToSkip = [
		'svg',
		'IMG',
	]

	const colors_to_skip  = [
		// 'rgb(0, 0, 0)',
		// 'rgba(0, 0, 0, 0)'
	];

	let textClassesToSkip = '';

	let proc_img = true;

	if (cfg.skipWhites) {
		const white = [
			'rgb(255, 255, 255)',
			'rgb(254, 254, 254)',
			'rgb(253, 253, 253)',
			'rgb(252, 252, 252)',
			'rgb(251, 251, 251)',
			'rgb(250, 250, 250)'
		];

		colors_to_skip.push(...white);
	}

	if (cfg.skipHeadings)
		globalTagsToSkip.push(...['H1', 'H2', 'H3']);

	let callcnt = 0;

	const rgba_rules = new Set();

	const applyExceptions = () => {
		let host = url.replace('www.', '');

		switch (host) {
			case 'youtube.com':
				// Make sure youtube player stays untouched
				textClassesToSkip += 'ytp';
				proc_img = false;
				break;
			case 'facebook.com':
				// skipWhites = true;
				proc_img = false;
				break;
		}
	};

	applyExceptions();

	const process = (nodes, mutation = false) => {
		// Debug variables
		let   db_arr     = [];
		const db_node    = true;
		const db_time    = false;
		let   db_timestr = `Process ${callcnt++} time`;

		if (db_time)
			console.time(db_timestr);

		const textNodesToSkip = [];
		const nodes_behind_img = [];

		const new_rgba_rules = new Set();

		const setTextAttribs = node => {

			const tag = String(node.nodeName);

			const style = getComputedStyle(node);

			const bg              = style.getPropertyValue('background');

			if (textTagsToSkip.includes(tag))
				return;

			if (textNodesToSkip.includes(node))
				return;

			if (textClassesToSkip.length) {

				const classname = String(node.className);

				if (classname.includes(textClassesToSkip)) {
					textNodesToSkip.push(...nlToArr(node.getElementsByTagName('*')));
					return;
				}
			}

			const bg_color        = style.getPropertyValue('background-color');

			const isRound = checkIsRound(node);
			if (isRound) {
				node.setAttribute('r__', '');
			}
			// чтобы норм кружочки были в соц-сетях
			if (
				isButtonWithoutIcon(node, tag, style) ||
				(
					bg_color &&
					bg_color !== 'rgba(255, 255, 255)' &&
					bg_color !== 'rgba(0, 0, 0, 0)' &&
					isRound
				)
			) {
				// if (isRound) {
				// 	node.setAttribute('r__', '');
				// }
				node.setAttribute('tbg__', '');
				const {borderWidth} = style;
				if (parseFloat(borderWidth) === 0) {
					node.setAttribute('bg_bs__', '');
				} else {
					const {borderColor} = style;
					// if (
					// 	borderColor !== 'rgba(0, 0, 0, 0)' &&
					// 	borderColor !== 'rgba(0, 0, 0)'
					// ) {
						node.setAttribute('bg_b__', '');
					// }
				}
			}

			const f_sz = parseInt(style.getPropertyValue('font-size'));

			if (f_sz === 0)
				return;

			if (cfg.size > 0) {
				if (f_sz <= cfg.threshold)
					node.setAttribute('s__', f_sz);
			}

			let img_offset = 0;

			if (proc_img) {
				const bg_img = style.getPropertyValue('background-image');

				if (bg_img !== 'none') {
					const img_children = nlToArr(node.getElementsByTagName("*"));
					nodes_behind_img.push(...img_children);
					img_offset = 127;
				}

				if (nodes_behind_img.includes(node))
					img_offset = 96;
			}

			if (cfg.input_border) {
				if(node.nodeName === 'INPUT' && node.type !== 'submit')
					node.setAttribute('b__', '');
			}

			if (!childNodesContainsTextOrSvg(node))
				return;

			const color = style.getPropertyValue('color');

			if (colors_to_skip.includes(color))
				return;

			let rgba_arr = getRGBarr(color);

			if (!rgba_arr)
				return;

			// if (rgba_arr.length > 3) {
			//
			// 	const class_name = `fc_rgba__${rgba_arr[0]}${rgba_arr[1]}${rgba_arr[2]}`;
			// 	node.classList.add(class_name);
			//
			// 	const new_color = color.replace(/\d\.\d+/, '1');
			// 	const rule      = `.${class_name}{color:${new_color}!important}`;
			//
			// 	new_rgba_rules.add(rule);
			// }

			const fg_colorfulness = calcColorfulness(rgba_arr);


			let db_obj = {};

			if (db_node) {
				db_obj = {
					tag,
					className: String(node.className),
					text: node.innerText,
					bg,
					fg_colorfulness,
				};

				db_arr.push(db_obj);
			}

			const bg_threshold = 160 - cfg.strength + img_offset;

			// if (bg_brt < bg_threshold)
			// return;

			// const contrast = +Math.abs(bg_brt - fg_brt).toFixed(2);
			const is_link  = tag === 'A';

			// if (cfg.skipColoreds) {
			// 	let   min_contrast      = 132 + (cfg.strength / 2);
			// 	const min_link_contrast = 96 + (cfg.strength / 3);
			// 	const min_colorfulness  = 32;
			//
			// 	if (db_node)
			// 		Object.assign(db_obj, { contrast, min_contrast, min_link_contrast });
			//
			// 	if (is_link)
			// 		min_contrast = min_link_contrast;
			//
			// 	if (contrast > min_contrast && fg_colorfulness > min_colorfulness)
			// 		return;
			// }


			// if (
			// 	bg_color &&
			// 	bg_color !== 'rgba(255, 255, 255)' &&
			// 	bg_color !== 'rgba(0, 0, 0, 0)'
			// ) {
				node.setAttribute('tbg__', '');
			// }
			node.setAttribute('d__', '');

			if (cfg.underlineLinks && is_link)
				node.setAttribute('u__', '');
		};

		const setBgAttribs = node => {
			const tag = String(node.nodeName);

			const style = getComputedStyle(node);

			const src             = node.getAttribute('src');
			const bg              = style.getPropertyValue('background');
			const bg_color        = style.getPropertyValue('background-color');
			const bg_image        = style.getPropertyValue('background-image');
			const width           = style.getPropertyValue('width');
			const widthNum        = parseInt(width);
			const height          = style.getPropertyValue('height');
			const heightNum       = parseInt(height);
			const opacity         = parseFloat(style.opacity);

			if (bg_image) {
				if (bg_image.includes('linear-gradient')) {
					node.setAttribute('bg_ig__', '');
				}

				if (bg_image.includes('url("')) {
					if (bg_image.includes('.svg')) {
						makeBackgroundUrlStyleWithSvg(node).then(svgBackground => {
							node.setAttribute('style', svgBackground);
							node.setAttribute('bg_us__', '');
						});
					} else if (
						bg_image.includes('.png') ||
						bg_image.includes('.webp') ||
						bg_image.includes('data:image/')
					) {
						node.setAttribute('bg_ut__', '');
					}
				}
			}

			// if (src.match(/url\(".*\.svg"\)/)) {
			// 	makeBackgroundUrlStyleWithSvg(node).then(svgBackground => {
			// 		node.setAttribute('src', svgBackground)
			// 	});
			// }

			if (
				node.getAttribute('d__') === null &&
				node.getAttribute('tbg__') === null &&
				bg_color &&
				bg_color !== 'rgba(255, 255, 255)' &&
				bg_color !== 'rgba(0, 0, 0, 0)' &&
				getAlfa(bg_color) > 0.5 &&
				opacity > 0.5 &&
				!bg.match(/url/) &&
				tag !== 'IMG' &&
				(
					width === 'auto' ||
					height === 'auto' ||
					(widthNum > 10 && heightNum > 10 && widthNum * heightNum > 1000)
				)
			) {
				node.setAttribute('bg__', '');
				if (
					widthNum > 50 &&
					heightNum > 50 &&
					widthNum * heightNum > 30_000
				) {
					const {borderWidth} = style;
					if (parseFloat(borderWidth) === 0) {
						node.setAttribute('bg_bs__', '');
					} else {
						const {borderColor} = style;
						if (
							borderColor !== 'rgba(0, 0, 0, 0)' &&
							borderColor !== 'rgba(0, 0, 0)'
						) {
							node.setAttribute('bg_b__', '');
						}
					}
				}
			}

			if (opacity > 0.1 && opacity < 0.9) {
				node.setAttribute('o__', '');
			}

		}

		const setOtherAttribs = (node, style = getComputedStyle(node)) => {
			const {
				borderTopWidth,
				borderRightWidth,
				borderBottomWidth,
				borderLeftWidth,

				borderRightColor,
				borderTopColor,
				borderBottomColor,
				borderLeftColor,
			} = style;

			const borderTopWidthNum = parseInt(borderTopWidth);
			const borderRightWidthNum = parseInt(borderRightWidth);
			const borderBottomWidthNum = parseInt(borderBottomWidth);
			const borderLeftWidthNum = parseInt(borderLeftWidth);

			const blackBorders = [];
			const checkIsBorderBlack = (borderWidthNum, borderColor) => (
				borderWidthNum > 0 &&
				borderColor &&
				borderColor !== 'rgba(0, 0, 0, 0)' &&
				borderColor !== 'rgba(0, 0, 0)'
			);

			if (checkIsBorderBlack(borderTopWidthNum, borderTopColor)) {
				blackBorders.push('t');
			}
			if (checkIsBorderBlack(borderRightWidthNum, borderRightColor)) {
				blackBorders.push('r');
			}
			if (checkIsBorderBlack(borderBottomWidthNum, borderBottomColor)) {
				blackBorders.push('b');
			}
			if (checkIsBorderBlack(borderLeftWidthNum, borderLeftColor)) {
				blackBorders.push('l');
			}

			if (blackBorders.length === 4) {
				node.setAttribute('bc_a__', '');
			} else {
				blackBorders.forEach(border => {
					node.setAttribute(`bc_${border}__`, '');
				})
			}
		}

		const setAttribs = node => {
			const tag = String(node.nodeName);
			if (globalTagsToSkip.includes(tag))
				return;
			setTextAttribs(node);
			setBgAttribs(node);
			setOtherAttribs(node);
		}

		const iterateBigArr = (arr) => {
			const chunk = 200;
			const len   = arr.length;

			let idx = 0;

			const doChunk = () => {
				let c = chunk;

				while (c--) {
					if (idx > len - 1)
						return;

					setAttribs(arr[idx++]);
				}

				setTimeout(doChunk, 0);
			};

			doChunk();
		}

		iterateBigArr(nodes);

		// Get the RGBA selectors that aren't already present.
		// const diff = [...new_rgba_rules].filter(x => !rgba_rules.has(x));

		// if (diff.length) {
		// 	css_node.nodeValue += diff.join('');
		//
		// 	for (const new_rule of new_rgba_rules)
		// 		rgba_rules.add(new_rule);
		// }

		if (db_time)
			console.timeEnd(db_timestr);

		if (db_node)
			console.table(db_arr);
	}

	process(nodes);

	const observer = mutations => {
		let new_nodes = [];

		mutations.forEach(mut => {
			for (const node of mut.addedNodes) {
				if (!(node instanceof Element))
					continue;

				// Get children of node, then node itself
				const nodes = nlToArr(node.getElementsByTagName('*'));
				nodes.push(node);

				new_nodes.push(...nodes);
			}
		});

		if(new_nodes.length)
			setTimeout(() => process(new_nodes, true), 200);
	};

	new MutationObserver(observer).observe(document.body, { childList: true, subtree: true });

	style_node.appendChild(css_node);
}

init();

chrome.runtime.sendMessage({ from: 'toggle', enabled: true });
