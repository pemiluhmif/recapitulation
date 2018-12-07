const { dialog, app, ipcMain, BrowserWindow } = require('electron');
const Database = require('./database');
const yargs = require('yargs');
const fs = require('fs');

const crypto = require('crypto');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

let voteResults = {};

function createWindow () {
    win = new BrowserWindow({
        width: 1024,
        height: 600,
        resizable: true
    });

    ipcMain.on("getVoteData",(event,args)=>{
        event.returnValue = voteResults;
    });

    ipcMain.on("getVoteType",(event,args)=>{
        event.returnValue = Database.getConfig("voting_types");
    });

    // win.setMenu(null);
    win.loadFile('anim/index.html');
    win.focus();
    win.webContents.openDevTools();
    win.setFullScreen(true);

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    });


}

function verifyData(data, sig){
    let sigGen = crypto.createHash('sha256').update(data).digest('hex');
    return sig===sigGen;
}

function verifyLastSig(data,sig,machineKey){
    let sigGen = crypto.createHmac('sha256', machineKey).update(data).digest('hex');
    return sigGen === sig;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', ()=>{
    let argv = yargs.usage("Usage: $0 [options]")
        .example("$0 -c --db myDb.db")
        .alias("h","help")
        .alias("v","version")
        .alias("c","count")
        .alias("o","output")
        .boolean("c")
        .boolean("anim")
        .describe("c","Count vote")
        .describe("o","Output JSON file")
        .describe("db","Database location")
        .describe("auth","Folder containing auth")
        .describe("anim","Show counting animation")
        .nargs("auth",1)
        .nargs("db",1)
        .default("o","dump.json")
        .default("db","pemilu.db")
        .default("auth","auth/")
        .argv;

    let status = Database.init(argv.db);

    if(status["status"]){
        // Initial config

        let json = {};
        json['vote_data'] = Database.getVoteRecords();
        json['last_signature'] = Database.getLastSignatures();

        if(argv.d){
            fs.writeFile(argv.o, JSON.stringify(json,null,4), 'utf8', (err)=>{
                if(err){
                    console.error(err.message);
                    dialog.showErrorBox("Error on writing",err.message);
                }else{
                    console.log("Finish");
                    app.quit();
                }
            });
        }else if(argv.count){
            let sigArr = json['last_signature'];
            let records = {};

            try {
                sigArr.forEach((item) => {
                    console.log("Processing "+item.node_id);
                    let voteData = json['vote_data'].filter((vote) => (vote.node_id === item.node_id));
                    voteData = voteData.reverse();

                    let lastSig = item.last_signature;

                    let authFolder = "";
                    if(argv.auth!==undefined){
                        authFolder = argv.auth;
                    }

                    let authRaw = fs.readFileSync(authFolder+"auth_"+item.node_id+".json");
                    let auth = JSON.parse(authRaw);
                    if(auth.machine_key===undefined){
                        throw new Error("Auth file seem invalid for "+item.node_id);
                    }

                    if(!verifyLastSig(item.last_signature,item.signature,auth.machine_key)){
                        throw new Error("Last signature invalid for "+item.node_id);
                    }

                    voteData.forEach((vote) => {
                        if(!verifyData(vote.voted_candidate,vote.signature)){
                            throw new Error("Invalid sig "+vote.vote_id);
                        }
                        if (vote.signature === lastSig) {
                            let voteData = JSON.parse(vote.voted_candidate);
                            for(let typeVote in voteData.vote_data){
                                if(records[typeVote]===undefined){
                                    records[typeVote] = {};
                                }
                                if(records[typeVote][voteData.vote_data[typeVote]]===undefined){
                                    records[typeVote][voteData.vote_data[typeVote]] = 0;
                                }
                                records[typeVote][voteData.vote_data[typeVote]]++;
                            }
                            lastSig = vote.previous_signature;
                        } else {
                            throw new Error("Chain broken "+vote.vote_id + " sig = " + vote.signature + " last = " + lastSig);
                        }
                    });

                });
                console.log("All data verified");


                if(argv.anim){
                    for(let result in records){
                        let candidates = Database.getCandidates(result);

                        candidates.forEach((item)=>{
                            item["count"] = records[result][item.candidate_no];
                        });

                        voteResults[result] = candidates;
                    }

                    createWindow();
                }else{
                    console.log(records);
                    app.quit();
                }


            } catch (e) {
                dialog.showErrorBox("Error on counting",e.message);
                console.error(e.message);
                app.quit();
            }
        }
    }else{
        dialog.showErrorBox("Error on database load",status["msg"]);
    }

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
});

