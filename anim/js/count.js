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
                <p class="subtitle is-5">`+type.NIM+`</p>
            </div>
            <div class="card-footer">
                <div class="card-footer-item has-text-centered">
                    <p id="count-`+type.candidate_no+`" class="is-size-1">0</p>
                </div>
            </div>
        </div>`;

    $("#card-loc").append(insertHTML);
}

function addVote(candidateNo){
    let counter = $("#count-"+candidateNo);
    counter.text(parseInt(counter.text())+1);
}

function animAdd(voteData){
    let total = 0;
    let candidateTotal = voteData.length;

    $.each(voteData,(key,val)=>{
        total += val.count;
    });

    let totalText = total;

    let voteCount = voteData.sort((a,b)=>{
        return a.candidate_no>b.candidate_no;
    });

    console.log(voteCount);


    let intAdd = setInterval(()=>{
        let randomVote = -99;
        do{
            randomVote = Math.floor(Math.random() * candidateTotal );
        }while(voteCount[randomVote].count<=0);

        voteCount[randomVote].count--;
        addVote(randomVote);
        total--;
        if(total===0){
            clearInterval(intAdd);
            $('#total-count').animate({'opacity': 0}, 400, function () {
                $(this).text("Total suara = "+totalText);
            }).animate({'opacity': 1}, 400);
            $("#return-button").animate({opacity:1},400);
        }
    },200);
}

$( document ).ready(function() {


    let voteData = ipcRenderer.sendSync("getVoteData");
    let voteType = ipcRenderer.sendSync("getVoteType");

    let type = window.location.hash.substring(1);
    if(type!==""){

        let typeObj = voteType.find(item => {return item.type === type});

        $("#count-type").text(typeObj.title);

        voteResult = voteData[type];
        $.each(voteResult,(key,val)=>{
            addCard(val);
        });

        animAdd(voteResult);


    }else{
        alert("Error no type specified");
    }
});