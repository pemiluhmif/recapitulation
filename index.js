const { dialog, app, BrowserWindow } = require('electron');
const Database = require('./database');
const yargs = require('yargs');
const fs = require('fs');

const crypto = require('crypto');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow () {
    win = new BrowserWindow({
        width: 1024,
        height: 600,
        resizable: true
    });
    // win.setMenu(null);
    // win.loadURL('');
    win.focus();

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
        .describe("c","Count vote")
        .describe("o","Output JSON file")
        .describe("db","Database location")
        .nargs("db",1)
        .default("o","dump.json")
        .default("db","pemilu.db")
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

                    let authRaw = fs.readFileSync("auth_"+item.node_id+".json");
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
                console.log(records);

            } catch (e) {
                console.error(e.message);
            }


        }

        app.quit();
        // createWindow();

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

