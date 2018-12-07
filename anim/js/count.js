const $ = require("jquery");
const {ipcRenderer} = require("electron");

let voteResult = [];

function addCard(type){
    let insertHTML = `
        <div class="card profile" id="card-`+type.NIM+`">
            <div class="card-image">
                <figure class="image is-4by5" style="background-image: url('`+type.image_file_path.substr(1)+`');">
                </figure>
            </div>
            <div class="card-content">
                <p class="title is-4">`+type.name+`</p>
            </div>
            <div class="card-footer">
                <div class="card-footer-item">
                    <p class="subtitle is-5">`+type.NIM+`</p>
                </div>
            </div>
        </div>`;

    $("#card-loc").append(insertHTML);
}


$( document ).ready(function() {
    let voteData = ipcRenderer.sendSync("getVoteData");
    let voteType = ipcRenderer.sendSync("getVoteType");

    let type = window.location.hash.substring(1);
    if(type!==""){
        console.log(voteType);

        let typeObj = voteType.find(item => {return item.type === type});

        console.log(typeObj);

        $("#count-type").text(typeObj.title);

        voteResult = voteData[type];
        $.each(voteResult,(key,val)=>{
            addCard(val);
        });
    }else{
        alert("Error no type specified");
    }
});