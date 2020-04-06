
let clickedVideo = false;

const recordingMediaTypes = {
    audio: false,
    video: true
};

function blobToBase64(blob, cb) {
    let reader = new FileReader();
    reader.onload = function() {
        let dataUrl = reader.result;
        let base64 = dataUrl.split(',')[1];
        cb(base64);
    };
    reader.readAsDataURL(blob);
}

function openCamera() {
    if (!clickedVideo) {
        clickedVideo = true;
        console.log('Opening camera...2');
        navigator.mediaDevices.getUserMedia(recordingMediaTypes)
            .then((mediaInput) => {
                console.log(mediaInput); // Sissetulev meedia
                let videoEl = document.querySelector('video');
                if ("srcObject" in videoEl) {
                    videoEl.srcObject = mediaInput;
                }

                videoEl.onloadedmetadata = function () {
                    videoEl.play(); // Kuva kaamerast tulev pilt video elementi
                };

                let mediaRecorder = new MediaRecorder(mediaInput);
                let mediaData = [];

                // start recording
                document.getElementById('startRecording')
                    .addEventListener('click', () => {
                        console.log('started recording');
                        $('#startRecording').attr('disabled', true);
                        $('#stopRecording').attr('disabled', false);
                        mediaRecorder.start();
                });

                // stop recording
                document.getElementById('stopRecording')
                    .addEventListener('click', () => {
                        console.log('stopped recording');
                        $('#startRecording').attr('disabled', false);
                        $('#stopRecording').attr('disabled', true);
                        mediaRecorder.stop();
                    });

                // save chunks of data
                mediaRecorder.ondataavailable = function (event) {
                    mediaData.push(event.data)
                };

                // save data as video after stopping
                mediaRecorder.onstop = () => {
                    console.log('Media recorder got stop signal');
                    let dataBlob = new Blob(mediaData, {'type': 'video/mp4'});

                    blobToBase64(dataBlob, function(base64) {
                        let obj = {'blob': base64};
                        let dataToSend = JSON.stringify(obj);
                        console.log(dataToSend);
                        $.post('http://127.0.0.1:3000/saveVideo', obj, function (data, status) {
                            console.log(data);
                            console.log(status)
                        })
                    });
                    mediaData = [];

                }

        })
    }
}

function downloadVideo(videoId) {
    console.log('downloading video with id: ', videoId);
    window.open('http://127.0.0.1:3000/video/download/' + videoId)
}

function getVideo(videoId) {
    console.log(videoId);
    let playVideo = $('#playVideo');
    playVideo.empty();
    playVideo.append('<video controls>\n' +
        '        <source src="http://127.0.0.1:3000/video/' + videoId + '" type="video/webm">\n' +
        '    </video>\n' +
        '<button onclick="downloadVideo(' + videoId +')">Download</button>');
}

function getSavedVideos() {
    $.get("http://127.0.0.1:3000/video", function(data, status){
        $('#savedVideos').empty();
        for (i = 0; i < data.length; i++) {
            let videoId = data[i];
            let row = '<span onclick="getVideo(' + videoId + ')">Video - ' + videoId + ' </span><br>';
            console.log(row);
            $('#savedVideos').append(row);
        }
    });
}


