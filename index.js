const { dialog, app, BrowserWindow } = require('electron');
const Database = require('./database');
const yargs = require('yargs');
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

function createWindow () {
    win = new BrowserWindow({
        width: 1024,
        height: 600,
        resizable: true
    })
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', ()=>{
    let argv = yargs.usage("Usage: $0 [options]")
        .example("$0 -d --db myDb.db")
        .example("$0")
        .alias("h","help")
        .alias("v","version")
        .alias("d","dump votes")
        .alias("o","output")
        .boolean("d")
        .array("db")
        .default("o","dump.json")
        .default("db","pemilu.db")
        .argv;

    let status = Database.init(argv.db[0]);

    if(status["status"]){
        // Initial config

        if(argv.d){
            let json = {};
            json['vote_data'] = Database.getVoteRecords();
            json['last_signature'] = Database.getLastSignatures();

            fs.writeFile(argv.o, JSON.stringify(json,null,4), 'utf8', (err)=>{
                if(err){
                    console.error(err.message);
                    dialog.showErrorBox("Error on writing",err.message);
                }else{
                    console.log("Finish");
                    app.quit();
                }
            });
        }



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

