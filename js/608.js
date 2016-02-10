// http://edocket.access.gpo.gov/cfr_2007/octqtr/pdf/47cfr15.119.pdf

'use strict'

function parse608(cues) {
    function hex(byte) {
        var s = byte.toString(16);
        return s.length < 2 ? '0' + s : s;
    }

    function parity(byte) {
        var bits = 0;
        while (byte) {
            bits += byte & 1;
            byte = byte >> 1;
        }
        return bits % 2;
    }

    function to7bit(byte) {
        return byte & 0x7F;
    }

    function toCharCode(byte) {
        switch (byte) {
        case 0x2A: // Lower-case a with acute accent
            return 0xE1;
        case 0x5C: // Lower-case e with acute accent
            return 0xE9;
        case 0x5E: // Lower-case i with acute accent
            return 0xED;
        case 0x5F: // Lower-case o with acute accent
            return 0xF3;
        case 0x60: // Lower-case u with acute accent
            return 0xFA;
        case 0x7B: // Lower-case c with cedilla
            return 0xE7;
        case 0x7C: // Division sign
            return 0xF7;
        case 0x7D: // Upper-case N with tilde
            return 0xD1;
        case 0x7E: // Lower-case n with tilde
            return 0xF1;
        case 0x7F: // Solid block
            return 0x2588;
        default: // the rest match ASCII
            return byte;
        }
    }


    function toCharCodeExtended(bytes) {
	var extended={
		0x1220: 0xC1,	0x1221: 0xC9,   0x1222: 0xD3,      
	    	0x1223:0xDA,	0x1224: 0xDC,	0x1225: 0xFC,
		0x1226:	0x2018, 0x1227:	0xA1,	0x1228: 0x2A,
		0x1229: 0x2019, 0x122A: 0x2014, 0x122B: 0xA9,
		0x122C: 0x2120,	0x122D: 0xB7,	0x122E: 0x201C,
		0x122F: 0x201D,	0x1230: 0xC0,	0x1231:	0xC2,
		0x1232: 0xC7,   0x1233: 0xC8,   0x1234: 0xCA,   
		0x1235: 0xCB,   0x1236: 0xEB,   0x1237: 0xCE,   
		0x1238: 0xCF,   0x1239: 0xEF,   0x123A: 0xD4,   
		0x123B: 0xD9,   0x123C: 0xF9,   0x123D: 0xDB,   
		0x123E: 0xAB,   0x123F: 0xBB,   0x1320: 0xC3,   
		0x1321: 0xE3,   0x1322: 0xCD,   0x1323: 0xCC,   
		0x1324: 0xEC,   0x1325: 0xD2,   0x1326: 0xF2, 
		0x1327: 0xD5,   0x1328: 0xF5,   0x1329: 0x7B,   
		0x132A: 0x7D,   0x132B: 0x5C,   0x132C: 0x5E,   
		0x132D: 0x1F,   0x132E: 0x7C,   0x132F: 0x7E,   
		0x1330: 0xC4,   0x1331: 0xE4,   0x1332: 0xD6,   
		0x1333: 0xF6,   0x1334: 0xDF,   0x1335: 0xA5,   
		0x1336: 0xA4,   0x1337: 0xA6,   0x1338: 0xC5,		 
		0x1339: 0xE5,   0x133A: 0xD8,   0x133B: 0xF8,   
		0x133C: 0x250C, 0x133D: 0x2510, 0x133E: 0x2514,
		0x133F: 0x2518      
		}

	if (extended[bytes]){
		return extended[bytes]
		}
}
	
function toCharCodeSpecial(byte) {
       
    var  specials ={
		0x30: 0xAE, 0x31: 0xB0,   0x32: 0xBD,
		0x33: 0xBF, 0x34: 0x2122, 0x35: 0xA2, 
		0x36: 0xA3, 0x37: 0x266A, 0x38: 0xE0,
		0x39: 0x20, 0x3A: 0xE8,	  0x3B: 0xE2,
		0x3C: 0xEA, 0x3D: 0xEE,	  0x3E: 0xF4,
		0x3F: 0xFB
        }
	
	if (specials[byte]){
		return specials[byte]
		}
}

			
    function createChannel() {
        var ROWS = 15;
        var COLUMNS = 32;

        var mode; // pop-on, paint-on, roll-up
        var displayedMemory = new Uint16Array(ROWS * COLUMNS);
        var nonDisplayedMemory = new Uint16Array(ROWS * COLUMNS);
        var row = 1;
        var column = 1;

        function index(row, column) {
            console.assert(row >= 1 && row <= ROWS && column >= 1 && column <= COLUMNS);
            return (COLUMNS * (row - 1)) + (column - 1);
        }

        function set(row, column, charCode) {
            var memory = mode == 'pop-on' ? nonDisplayedMemory : displayedMemory;
            memory[index(row, column)] = charCode;
        }

        function get(row, column) {
            return displayedMemory[index(row, column)];
        }

        function handleCharCode(charCode) {
            set(row, column, charCode);
            if (column < COLUMNS)
                column++;
        }

        function handleCharacter(byte) {
            console.assert(byte >= 0x20);
            handleCharCode(toCharCode(byte));
        }

        function handleSpecialCharacter(byte) {
            console.assert(byte >= 0x30 && byte <= 0x3F);
            handleCharCode(toCharCodeSpecial(byte));
        }

        function handleExtendedCharacter(first, second) {
            console.assert(first >= 0x12 && first <= 0x13 && second >= 0x20 && second <= 0x3F);
            // replace previous character
            if (column > 1) {
                column--;
            }
            handleCharCode(toCharCodeExtended((first << 8) + second));
        }

        function handlePreambleAddressCode(first, second) {
            console.assert(first >= 0x10 && first <= 0x17 && second >= 0x40 && second <= 0x7F);
            if (first == 0x11) {
                row = second <= 0x5F ? 1 : 2;
            } else if (first == 0x12) {
                row = second <= 0x5F ? 3 : 4;
            } else if (first == 0x15) {
                row = second <= 0x5F ? 5 : 6;
            } else if (first == 0x16) {
                row = second <= 0x5F ? 7 : 8;
            } else if (first == 0x17) {
                row = second <= 0x5F ? 9 : 10;
            } else if (first == 0x10 && second >= 0x60) {
                row = 11;
            } else if (first == 0x13) {
                row = second <= 0x5F ? 12 : 13;
            } else if (first == 0x14) {
                row = second <= 0x5F ? 14 : 15;
            } else {
                console.warn('invalid preamble address code ' + hex(first) + hex(second));
                return;
            }
            if ((second >= 0x40 && second <= 0x4F) || (second >= 0x60 && second <= 0x6F)) {
                console.warn('ignoring color/underline/italics');
            } else if ((second >= 0x50 && second <= 0x5F) || (second >= 0x70 && second <= 0x7F)) {
                var indent = second
                if (indent <= 0x5F) {
                    indent -= 0x50;
                } else {
                    indent -= 0x70;
                }
                indent = (indent >> 1) << 2;
                column = 1 + indent;
            }
        }

        function handleMidRowCode(first, second) {
            console.assert(first == 0x11 && second >= 0x20 && second <= 0x2F);
            console.warn('ignoring mid-row code');
            handleCharCode(0x20);
        }

        function resumeCaptionLoading() {
            mode = 'pop-on';
        }

        function backspace() {
            console.assert(false, 'backspace not supported');
        }

        function deleteToEndOfRow() {
            console.assert(false, 'delete to end of row not supported');
        }

        function rollUpCaptions(rows) {
            console.assert(false, 'roll-up captions not supported');
            if (mode != 'roll-up') {
                mode = 'roll-up';
                row = 15;
                column = 1;
            }
        }

        function flashOn() {
            console.warn('ignoring flash on');
            handleCharCode(0x20);
        }

        function resumeDirectCaptioning() {
            console.assert(false, 'direct captioning not supported');
        }

        function textRestart() {
            console.assert(false, 'text restart not supported');
        }

        function resumeTextDisplay() {
            console.assert(false, 'resume text display not supported');
        }

        function erase(memory) {
            for (var index = 0; index < memory.length; index++) {
                memory[index] = 0;
            }
        }

        function carriageReturn() {
            if (mode == 'roll-up') {
                console.assert(false, 'carriage return not supported');
            }
        }

        function endOfCaption() {
            mode = 'pop-on';
            // flip memories
            var tmp = displayedMemory;
            displayedMemory = nonDisplayedMemory;
            nonDisplayedMemory = tmp;
        }

        function tabOffset(columns) {
            console.assert(columns >= 1 && columns <= 3);
            columns = Math.min(column + columns, COLUMNS);
        }

        function resumeDirectCaptioning() {
            mode = 'paint-on';
        }

        function handleControlCode(pair, first, second) {
            if (first == 0x11 && second >= 0x30 && second <= 0x3F) {
                handleSpecialCharacter(second);
            } else if (first >= 0x12 && first <= 0x13 && second >= 0x20 && second <= 0x3F) {
                handleExtendedCharacter(first, second);
            } else if (second >= 0x40 && second <= 0x7F) {
                handlePreambleAddressCode(first, second);
            } else if (first == 0x11 && second >= 0x20 && second <= 0x2F) {
                handleMidRowCode(first, second);
            } else if (first == 0x14 && second == 0x20) {
                resumeCaptionLoading();
            } else if (first == 0x14 && second == 0x21) {
                backspace();
            } else if (first == 0x14 && second == 0x24) {
                deleteToEndOfRow();
            } else if (first == 0x14 && second >= 0x25 && second <= 0x27) {
                rollUpCaptions(second - 0x23);
            } else if (first == 0x14 && second == 0x28) {
                flashOn();
            } else if (first == 0x14 && second == 0x29) {
                resumeDirectCaptioning();
            } else if (first == 0x14 && second == 0x2A) {
                textRestart();
            } else if (first == 0x14 && second == 0x2B) {
                resumeTextDisplay();
            } else if (first == 0x14 && second == 0x2C) {
                erase(displayedMemory);
            } else if (first == 0x14 && second == 0x2D) {
                carriageReturn();
            } else if (first == 0x14 && second == 0x2E) {
                erase(nonDisplayedMemory);
            } else if (first == 0x14 && second == 0x2F) {
                endOfCaption();
            } else if (first == 0x17 && second >= 0x21 && second <= 0x23) {
                tabOffset(second - 0x20);
            } else {
                console.warn('unsupported control code ' + pair + ' (' + hex(first) + hex(second) + ')');
            }
        }

        function toString() {
            var charCodes = [];
            var row, column, charCode;
            for (row = 1; row <= ROWS; row++) {
                for (column = 1; column <= COLUMNS; column++) {
                    charCode = get(row, column); 
            //console.log(String.fromCharCode.apply(String, [charCode]));
                    charCodes.push(charCode ? charCode : 0x20);
                }
                charCodes.push(0x0A);
            }
            console.log(String.fromCharCode.apply(String, charCodes));
            return String.fromCharCode.apply(String, charCodes);
        }

        return {
            handleCharacter: handleCharacter,
            handleControlCode: handleControlCode,
            toString: toString
        };
    }

    var c1 = createChannel();
    var c2 = createChannel();
    var cc; // current channel

    cues.forEach(function(cue) {
        var index, pair, first, second;
        for (index = 0; index + 1 < cue.data.length; index += 2) {
            first = cue.data[index];
            second = cue.data[index + 1];
            pair = hex(first) + hex(second);
            if (parity(first) != 1 || parity(second) != 1) {
                console.warn('failed parity check for ' + pair);
                continue;
            }
            first = to7bit(first);
            second = to7bit(second);
            if (first >= 0x10 && first <= 0x1F && second >= 20 && second <= 0x7F) {
                // control codes
                if (index >= 2 && cue.data[index] == cue.data[index - 2] && cue.data[index + 1] == cue.data[index - 1]) {
                    // ignore redundant control code
                    continue;
                }
                if (first < 0x18) {
                    cc = c1;
                } else {
                    // channel 2 control codes are offset by 8
                    cc = c2;
                    first -= 8;
                }
                cc.handleControlCode(pair, first, second);
            } else {
                if (cc) {
                    if (first >= 0x20) {
                        cc.handleCharacter(first);
                    } else if (first != 0x00) {
                        console.info('ignoring non-printing character ' + hex(first));
                    }
                    if (second >= 0x20) {
                        cc.handleCharacter(second);
                    } else if (second != 0x00) {
                        console.info('ignoring non-printing character ' + hex(second));
                    }
                } else {
                    console.warn('no current channel, ignoring ' + pair);
                }
            }
        }
	var out=document.getElementById('output')
        if (cc) {
            var pre = document.createElement('div');
	    pre.className="fu"
	    var timespan=document.createElement('span')
	    timespan.textContent=cue.stamp  
	    pre.appendChild(timespan)	
            pre.innerHTML += cc.toString();
            out.appendChild(pre);
        }
    });
}
