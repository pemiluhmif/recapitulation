const $ = require("jquery");
const {ipcRenderer} = require("electron");

let currentCount = "";
let voteData = {};
let countTypes = [];

function addCard(type){
    let insertHTML = `<a href="count.html#`+type.type+`" class="column card">
                        <div class="card-content">
                            <p>Foto</p>
                        </div>
                        <div class="card-footer">
                            <div class="card-footer-item">
                                `+type.title.charAt(0).toUpperCase() + type.title.substr(1).toLowerCase();+`
                            </div>
                        </div>
                    </a>`;

    $("#card-loc").append(insertHTML);
}


$( document ).ready(function() {
    voteData = ipcRenderer.sendSync("getVoteData");
    let voteType = ipcRenderer.sendSync("getVoteType");
    currentCount = voteData

    $.each(voteData,(key,val)=>{
        countTypes.push(key);
        console.log(voteType);
        let typeObj = voteType.find(item => {return item.type === key});

        addCard(typeObj);
    });
});