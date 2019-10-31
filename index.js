let request = require("request");
let fs = require("fs");
var HTMLParser = require('node-html-parser');

var myArgs = process.argv.slice(2); // 自行保证入参
var cid = myArgs[0];
var aid = myArgs[1];
var directory = myArgs[2];
var status = 1;

var url = 'https://www.zip118.com/index.php?g=Home&m=View&a=viewDocument&cid=' + cid + '&p_aid=' + aid + '&status=' + status;

function getValue(rawAttrs) {
	let values = rawAttrs.split(" ");
	var value = values.filter(obj => obj.startsWith("value"))[0];
	value = value.replace("value=", "").replace(/^"+|"+$/gm, '');
	return value;
}

var jsonHeaders = {
	'Pragma': 'no-cache',
	'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Cache-Control': 'no-cache',
	'Connection': 'keep-alive',
};

headers = {
	'Connection': 'keep-alive',
	'Pragma': 'no-cache',
	'Cache-Control': 'no-cache',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

function doRequest(options) {
	return new Promise(function (resolve, reject) {
		request(options, function (error, res, body) {
			if (!error && res.statusCode == 200) {
				resolve(body);
			} else {
				reject(error);
			}
		});
	});
}

async function GetNextPage(fValue, nextPageKey, readlimitValue, furlValue) {
	var options = {
		url: 'http://view31.book118.com/PDF/GetNextPage/?f=' + fValue + '&img=' + nextPageKey + '&isMobile=false&isNet=True&readLimit=' + readlimitValue + '&furl=' + furlValue,
		headers: headers
	};
	const body = await doRequest(options);
	let element = JSON.parse(body);
	let nextPage = element["NextPage"];
	let pageIndex = element['PageIndex'];
	return [nextPage, pageIndex]
}

request({
	url: url,
	headers: jsonHeaders,
	json: true
}, function (error, response, body) {
	var url = body.viewUrl;
	var res = url.replace("//", "http://");
	// console.log(res);
	// console.log('-----');
	request({
		url: res
	}, function (error, response, body) {
		var root = HTMLParser.parse(body);
		var imgValue = encodeURIComponent(getValue(root.querySelector('#Img').rawAttrs));
		var fValue = encodeURIComponent(getValue(root.querySelector('#Url').rawAttrs));
		var furlValue = encodeURIComponent(getValue(root.querySelector('#Furl').rawAttrs));
		var readlimitValue = encodeURIComponent(getValue(root.querySelector('#ReadLimit').rawAttrs));

		// console.log(imgValue);
		// console.log(fValue);
		// console.log(furlValue);
		// console.log(readlimitValue);
		// console.log('-----');
		var options = {
			url: 'http://view31.book118.com/PDF/GetNextPage/?f=' + fValue + '&img=' + imgValue + '&isMobile=false&isNet=True&readLimit=' + readlimitValue + '&furl=' + furlValue,
			headers: headers
		};
		request(options, async function (error, response, body) {
			// console.log("response body:", body);
			let element = JSON.parse(body);
			var nextPageKey = element["NextPage"];
			let pageCount = element['PageCount'];
			var pageIndex = element['PageIndex'];

			let path = './downloads/' + directory + '/';
			if (!fs.existsSync(path)) {
				fs.mkdirSync(path, {
					recursive: true
				});
			}

			for (; pageIndex <= pageCount;) {
				// console.log(pageIndex);

				let imageUrl = 'http://view31.book118.com/img/?img=' + nextPageKey + '&tp=';
				// console.log(imageUrl);
				var filepath = path + pageIndex + '.png'
				request.get({
						url: imageUrl,
						headers: headers
					})
					.on('response', (response) => {})
					.pipe(fs.createWriteStream(filepath))
					.on("error", (e) => {
						//   console.log("pipe error", e)
					})
					.on("finish", () => {
						//   console.log("finish: "+filepath);
					})
					.on("close", () => {})

				const res = await GetNextPage(fValue, nextPageKey, readlimitValue, furlValue)
				nextPageKey = res[0];
				pageIndex = res[1];

				setTimeout(function () {}, 200 + parseInt(Math.random() * 200));
			}
		});
	});
});