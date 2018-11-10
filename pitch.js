var NOTE_NAMES=[];
NOTE_NAMES[0]=['C','C\u266F','D','D\u266F','E','F','F\u266F','G','G\u266F','A','A\u266F','B'];
NOTE_NAMES[1]=['C','D\u266D','D','E\u266D','E','F','G\u266D','G','A\u266D','A','B\u266D','B'];
NOTE_NAMES[2]=['Do','Di','Re','Ri','Mi','Fa','Fi','So','Si','La','Li','Ti'];
NOTE_NAMES[3]=['Do','Ra','Re','Me','Mi','Fa','Se','So','Le','La','Te','Ti'];
NOTE_NAMES[4]=['0','1','2','3','4','5','6','7','8','9','10','11'];
var DEFAULT_COLOURS = ['red','orange','yellow','lime','green','olive','teal','aqua','blue','navy','fuchsia','purple'];
var KEY_MAPPING='Q2W3ER5T6Y7UI9O0P\xDB\xBB\xDCAZSXCFVGBNJMK\xBCL\xBE\xBF';
var keyWidth, pianoHeight, blackKeyHeight, startOctave=4, endOctave=5, mousePressed=false, clickedNote=-1, dragNote=-1, notation=0, colourNote;
var colours = new Array;
var canvas, context;
var sample = [0,0,0,0,0,0,0];
var testNotes = new Array(12);
var timer=null, userResponded, score;
var toneRow=new Array;
var editColours=false, testMode=false, selectNotes=false;
var notesPlaying = new Array, players = new Array, notePlaying=-1, audioContext, gainNode;
var pianoTone=true, octaveTolerant=true, useColours=false;

window.AudioContext = window.AudioContext||window.webkitAudioContext;
if (typeof(AudioContext)==='function') {
	audioContext =  new AudioContext();
	gainNode = audioContext.createGain();
	for (var i=0; i<7; i++) {
		(function(i){
			var request = new XMLHttpRequest();
			request.open('GET', 'Piano.mf.F' + i + '.mp3');
			request.responseType = 'arraybuffer';
			request.onload = function() {
				audioContext.decodeAudioData(request.response, function(buffer) {
					sample[i] = buffer;
					if (sample.indexOf(0) < 0)
						$('#piano').on('vmousemove',function(e){mouseMove(getX(e),getY(e))}).on('vmousedown',function(e){e.preventDefault(); mouseDown(getX(e),getY(e))}).on('vmouseup',function(e){mouseUp(getX(e),getY(e))}).on('vmouseout',function(){if (clickedNote>=0) {cancelNote(clickedNote); clickedNote=-1}}).on('dblclick',function(e){e.preventDefault(); if (editColours) showColourDialog(getX(e),getY(e))});
					})}
			request.send();
			}
		)(i);
		}
	}
else
	alert('Sorry, but Absolute Pitch is not compatible with this browser. Please try with the latest version of Chrome or Firefox instead. On Android, please use Firefox.');

$(document).on('pageshow', function() {
	if (typeof(Storage)!=='undefined' && localStorage.getItem('colours')!==null) {
		colours = JSON.parse(localStorage.colours);
		startOctave = localStorage.startOctave;
		endOctave = localStorage.endOctave;
		$('#startOctave').val(startOctave).slider('refresh');
		$('#endOctave').val(endOctave).slider('refresh');
		$('#volume').val(localStorage.volume).slider('refresh');
		$('#speed').val(localStorage.speed).slider('refresh');
		notation = localStorage.notation;
		octaveTolerant = localStorage.octaveTolerant=='1';
		useColours = localStorage.useColours=='1';
		tone = localStorage.tone;
		$('#tone').prop('selectedIndex', tone).slider('refresh');
		pianoTone = tone=='0';
		testNotes = JSON.parse(localStorage.testNotes);
		}
	else {
		colours = DEFAULT_COLOURS.slice(0);
		testNotes[0]=true;
		for (var i=1; i<12; i++) testNotes[i]=false;
		}
	setVolume($('#volume').val());
	$('#notation').prop('selectedIndex', notation).selectmenu('refresh');
	$('#octaveTolerant').prop('checked', octaveTolerant).checkboxradio('refresh');
	$('#useColours').prop('checked', useColours).checkboxradio('refresh');
	$('#optionsPanel').on('panelclose', optionsClose);
	var userAgent = navigator.userAgent.toLowerCase();
	if (userAgent.indexOf('firefox')>=0) {
		//firefox
		$('#piano').css('bottom', $('#footer').height() + 'px');
		if (userAgent.indexOf('android')>=0) {
			$('#tone').prop('selectedIndex',1).slider('refresh');
			pianoTone=false;
			}
		}
	drawPiano();
});
	
function getX(e)
	{
	return e.clientX - $('#piano').offset().left;
	}

function getY(e) {
	return e.clientY - $('#piano').offset().top;
	}

function optionsClose()	{
	if (typeof(Storage)!=='undefined') {
		localStorage.colours=JSON.stringify(colours);
		localStorage.startOctave=startOctave;
		localStorage.endOctave=endOctave;
		localStorage.notation=notation;
		localStorage.octaveTolerant=Number(octaveTolerant);
		localStorage.useColours=Number(useColours);
		localStorage.volume=$('#volume').val();
		localStorage.speed=$('#speed').val();
		localStorage.tone=$('#tone').prop('selectedIndex');
		localStorage.testNotes=JSON.stringify(testNotes);
		drawPiano();
		}
	}
	
function drawPiano() {
	var range=endOctave-startOctave;
	canvas=document.getElementById('piano');
	context=canvas.getContext('2d');
	keyWidth=Math.floor(window.innerWidth/(7*range));
	canvas.width=keyWidth*7*range;
	pianoHeight=Math.floor(3*window.innerHeight/(range+5));
	canvas.height=pianoHeight;
	blackKeyHeight=Math.floor(pianoHeight/2);
	var leftPos=0, keyDivision=Math.floor(keyWidth/3);
	for (var x=0; x<=7*range; x++) {
		context.moveTo(leftPos,0);
		context.lineTo(leftPos,pianoHeight);
		context.stroke();
		if (x%7!=3 && x%7!=0)
		   context.fillRect(leftPos-keyDivision,0,2*keyDivision,blackKeyHeight);
		leftPos+=keyWidth;
		}
	if (editColours)
		showPalette(true);
	else if (selectNotes)
		showTestNotes();
	var h = $(window).height()-$('#footer').height()-pianoHeight-17, fs = $(window).width()/6;
	//longest text is 10chrs, so adjust fontsize accordingly
	if (fs>h) fs = h;
	$('#noteName').height(h).css({fontSize: fs + 'px', lineHeight: h + 'px'});
	}
	
function highlightKey(x,down) {
	var o,n,leftBound,rightBound, noteNo=x%12;
	x-=startOctave*12;
	o=Math.floor(x/12);
	x=x%12;
	if (x>4) x++;
	if (x>12) x++;
	if (x%2==1) {
		x=(x+1)/2;
		//black key
		context.fillStyle=(down)?((useColours)?colours[noteNo]:'red'):'black';
		context.fillRect(keyWidth*(o*7+x)-Math.floor(keyWidth/3)+1, 0, Math.floor(2*keyWidth/3) - 2, blackKeyHeight-1);
		}
	else {
		//white key
		x=Math.floor(x/2);
		n=keyWidth*(o*7+x);
		context.fillStyle=(down)?((useColours)?colours[noteNo]:'red'):'white';
		//paint lower portion of white note
		context.fillRect(n+1, blackKeyHeight, keyWidth-2, pianoHeight-blackKeyHeight);
		//paint around adjacent black note
		if (x==0 || x==3)
			leftBound=n+1;
		else
			leftBound=n+Math.floor(keyWidth/3);
		if (x==2 || x==6)
			rightBound=n+keyWidth-1;
		else
			rightBound=n+keyWidth-Math.floor(keyWidth/3);
		context.fillRect(leftBound, 0, rightBound-leftBound, blackKeyHeight);
		}
	}
	
function mouseMove(x,y) {
	if ((timer==null) && (mousePressed)) {
		var note=mouseposToNote(x,y), newNote=note.noteNo+12*(startOctave+note.octave);
		if (newNote!=clickedNote) {
			//highlightKey(clickedNote,false);
			cancelNote(clickedNote);
			clickedNote=newNote;
			processNote();
			}
		}
	}

function keyUp(key)	{
	var keyNote;
	if (testMode) {
		if (timer!=null && key==32) cancelNote(clickedNote);
		}
	else if (timer==null) {
		keyNote=KEY_MAPPING.indexOf(String.fromCharCode(key));
		if (keyNote>=0) {
			keyNote+=12*startOctave;
			if (notesPlaying.indexOf(keyNote)>=0) {
				highlightKey(keyNote,false);
				stopNote(keyNote);
				if (notesPlaying.length>0) {
					keyNote=notesPlaying[notesPlaying.length-1] % 12;
					$('#noteName').text(noteName(keyNote)).css('color', colours[keyNote*useColours]);
					}
				else
					$('#noteName').text('');
				}
			}
		}
	}
	
function noteName(note) {
	return NOTE_NAMES[notation][note];
	}

function cancelNote(clickedNote) {
	highlightKey(clickedNote,false);
	$('#noteName').text('');
	if (timer==null) stopNote(clickedNote);
	}

function keyDown(key) {
	if (testMode) {
		if (key!=32 || timer==null) return;//check for spacebar only
		if (testNotes[notePlaying%12]) {
			userResponded=true;
			clickedNote=notePlaying;
			highlightClickedKey(notePlaying);
			}
		else {
			$('#noteName').text('Wrong: '+noteName(notePlaying%12)).css({'color': 'red'});;
			stopPlaying();
			}
	  }
	else if (timer==null) {
		var keyNote=KEY_MAPPING.indexOf(String.fromCharCode(key));
		if (keyNote>=0) {
			keyNote+=12*startOctave;
			if (notesPlaying.indexOf(keyNote)<0 && keyNote<endOctave*12) {
				highlightClickedKey(keyNote);
				playNote(keyNote);
				}
			}
		}
	}

function highlightClickedKey(note) {
	$('#noteName').text(noteName(note%12)).css('color',(useColours)?colours[note%12]:'red');
	highlightKey(note,true);
	}

function showColourDialog(x,y) {
	//allow user to define own colour
	var note=mouseposToNote(x,y);
	if (note.octave==0) {
		$('#colorPicker').click();
		colourNote = note.noteNo;
		}
	}
	
function changeColour(newColour) {
	colours[colourNote]=newColour;
	console.log('colours: ' + JSON.stringify(colours));
	highlightKey(colourNote + 12*startOctave,true);
	}

function mouseDown(x, y) {
	var note=mouseposToNote(x,y);
	if (editColours) {
		if (note.octave==0) {
		//allow user to drag and drop to swap colours
			dragNote=note.noteNo;
			canvas.style.cursor='move';
			}
		}
	else if (selectNotes) {
		if (note.octave==0) {
			testNotes[note.noteNo] = !testNotes[note.noteNo];
			highlightKey(note.noteNo+12*startOctave,testNotes[note.noteNo]);
			}
		}
	else if (timer!=null) {
		if (testMode) {
			clickedNote=note.noteNo+12*(startOctave+note.octave);
			if  (!testNotes[clickedNote % 12] || (!octaveTolerant && notePlaying!=clickedNote)
			|| (octaveTolerant && notePlaying%12!=clickedNote%12)) {
				$('#noteName').text('Wrong: '+noteName(notePlaying%12)).css({'color': 'red'});
				stopPlaying();
				}
			else {
				userResponded=true;
				highlightClickedKey(clickedNote);
				}
			}
		}
	else {	
		mousePressed=true;
		if (clickedNote>=0) highlightKey(clickedNote,false);
		clickedNote=note.noteNo+12*(startOctave+note.octave);
		processNote();
		}
	}

function mouseposToNote(x, y) {
	if (x>1) x-=2;//allow for border width
	y-=2;
	//number white notes 0 to 11
	var noteNo=2*Math.floor((x%(keyWidth*7))/keyWidth);
	if (noteNo>4) noteNo--;
	if (y<=blackKeyHeight) { //at black key level
		if (x%keyWidth>2*keyWidth/3) {
			if (noteNo!=4 && noteNo<11) noteNo++;
			}
		else if (x%keyWidth<keyWidth/3 && noteNo>0 && noteNo!=5) noteNo--;
		}
	return {noteNo:noteNo,octave:Math.floor(x/(keyWidth*7))};
	}

function processNote() {
	var	note=clickedNote % 12;
	if (timer!=null) {
	   userResponded=true;
	   if (testNotes[note%12] && note==notePlaying%12) highlightClickedKey(clickedNote);
	   }
	else {
	   highlightClickedKey(clickedNote);
	   playNote(clickedNote);
	   }
	}

function mouseUp(x, y) {
	mousePressed=false;
	if (dragNote>=0) {
		//determine drop note, then swap notes
		var noteNo = mouseposToNote(x,y).noteNo;
		if (noteNo!=dragNote) { //swap colours
			var dragColour=colours[dragNote];
			colours[dragNote]=colours[noteNo];
			colours[noteNo]=dragColour;
			showPalette(true);
			}
		dragNote=-1;
		canvas.style.cursor='pointer';
		}
	else if ((!selectNotes) && ($('#noteName').text().length<3)) {
		//if (!ctrlKey) {
			cancelNote(clickedNote);
			clickedNote=-1;
		//	}
		}
	}
	
function playNote(note) {
	if (pianoTone) {
		var source = audioContext.createBufferSource();
		source.buffer = sample[Math.floor(note/12)-1];
		source.connect(gainNode);
		gainNode.connect(audioContext.destination);
		source.playbackRate.value=Math.pow(2,(note%12-5)/12);
		source.start(0);
		players.push(source);
		}
	else {
		var oscillator = audioContext.createOscillator();
		oscillator.type = 0;//sine
		oscillator.frequency.value = 32.7032*Math.pow(2,note/12);
		oscillator.connect(gainNode);
		oscillator.connect(audioContext.destination);
		oscillator.start(0);
		players.push(oscillator);
		}
	notesPlaying.push(note);
	notePlaying=note;
	}
	
function stopNote(note) {
	var notepos=notesPlaying.indexOf(note);
	players[notepos].stop(0);
	notesPlaying.splice(notepos,1);
	players.splice(notepos,1);
	}

function stopAllNotes() {
	for (var i=0; i<players.length; i++) players[i].stop(0);
	notesPlaying.length=0;
	players.length=0;
	}
	
function setVolume(volume) {
	gainNode.gain.value=volume/10;
	}
	
function stopPlaying() {
	clearInterval(timer);
	timer=null;
	$('#playmode').val('start').slider('refresh');
	highlightKey(notePlaying,false);
	clickedNote = -1;
	stopNote(notePlaying);
	}

function startPlaying() {
	stopAllNotes();
	$('#noteName').text('');
	if (editColours || selectNotes) {
		if (editColours) {
			editColours = false;
			$('#editColours').prop('checked', false).checkboxradio('refresh');
			showPalette(false);
			}
		else {
			selectNotes = false;
			$('#selectNotes').prop('checked', false).checkboxradio('refresh');
			showTestNotes();
			}
		}
	userResponded=false;
	score=0;
	clearRow();
	var note=Math.floor(Math.random()*12);
	if (testNotes.indexOf(false)>=0) {
		while (testNotes[note]) note=Math.floor(Math.random()*12); //ensure first note not a test note
		}
	toneRow[note]=true;
	note+=12*(startOctave+Math.floor(Math.random()*(endOctave-startOctave)));
	playNote(note);
	timer = setInterval(timerEvent,4000/$('#speed').val());
	}
	
function changeSpeed(speed) {
	clearInterval(timer);
	timer = setInterval(timerEvent,4000/speed);
	}

function clearRow() {
	for (var i=0; i<12; i++) toneRow[i]=false;
	}

function timerEvent() {
	var note;
	if (toneRow.indexOf(false)<0) clearRow(); //all notes played
	do
		note=Math.floor(Math.random()*12);
	while (toneRow[note]);
	toneRow[note]=true;
	note+=(startOctave+Math.floor(Math.random()*(endOctave-startOctave)))*12;
	if (!testMode) {
		if (testNotes[notePlaying%12]) highlightKey(notePlaying,false);
		if (testNotes[note%12])
			highlightClickedKey(note);
		else
			$('#noteName').text('');			
		}
	else if (testNotes[notePlaying%12]) {
		if (userResponded) {
			$('#score').text(++score);
			userResponded=false;
			}
		else {
			$('#noteName').text('Missed: '+noteName(notePlaying%12)).css({'color': 'red'});
			stopPlaying();
			return;
			}
		}
	stopNote(notePlaying);
	playNote(note);
	}

function showPalette(on) {
	for (var i=12*startOctave; i<12*(startOctave+1); i++) highlightKey(i,on);
	}
	
function showTestNotes()
	{
	for (var i=12*startOctave; i<12*(startOctave+1); i++) highlightKey(i,testNotes[i%12] && selectNotes);
	}