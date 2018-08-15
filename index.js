#!/usr/bin/env node

const fs = require('fs');

function print_usage() {
  console.info('Usage:');
  console.info('mlw-create [template-name-or-directory] [workspace-name] ...');
  console.info('mlw-open [workspace-name] ...');
  console.info('mlw-info [workspace-name]');
  console.info('mlw-run [command] -w [workspace-name] ...');
  console.info('mlw-remove [workspace-name]');
}

var CLP = new CLParams(process.argv);

let arg1 = CLP.unnamedParameters[0] || '';
let arg2 = CLP.unnamedParameters[1] || '';
let arg3 = CLP.unnamedParameters[2] || '';

if (!arg1) {
  print_usage();
  return;
}

let handlers = {
  'create': handle_create,
  'open': handle_open,
  'info': handle_info,
  'run': handle_run,
  'remove': handle_remove
};

async function main() {
  if (arg1 in handlers) {
    try {
      await handlers[arg1]();
    }
    catch(err) {
      console.error(err);
      process.exit(-1);
    }
  } else {
    console.error(`Unknown command ${arg1}.`);
    process.exit(-1);
  }
}
main();

async function handle_create() {
  let template_name_or_directory = arg2;
  if (!template_name_or_directory) {
    console.error('Missing argument for template-name-or-directory');
    process.exit(-1);
  }
  let template_directory = await find_template_directory(template_name_or_directory);
  if (!template_directory) {
    console.error(`Unable to find template directory for ${template_name_or_directory}`);
    process.exit(-1);
  }
  let workspace_name = arg3;
  if (!workspace_name) {
    console.error('Missing argument for workspace-name');
    process.exit(-1);
  }
  await create_new_workspace(template_directory, workspace_name);
}

async function handle_open() {
  let workspace_name = arg2;
  if (!workspace_name) {
    console.error('Missing workspace argument.');
    process.exit(-1);
  }
  CLP.namedParameters['workspace'] = workspace_name;
  arg2 = 'open';
  await handle_run();
}

async function handle_info() {
  let workspace_name=arg2;
  if (!workspace_name) {
    console.error('Missing workspace argument.');
    process.exit(-1);
  }
  let workspace_directory=get_directory_for_workspace_name(workspace_name);
  if (!fs.existsSync(workspace_directory)) {
    console.error(`No such workspace: ${workspace_name}`);
    process.exit(-1);
  }
  let info=readJsonSync(workspace_directory+'/info.json');
  console.info(JSON.stringify(info,null,4));
}

function get_template_search_paths() {
  let ret=[];
  ret.push(__dirname+'/system-templates');
  
  let user_templates_dir=get_mlworkspace_base_dir()+'/templates';
  if (!fs.existsSync(user_templates_dir)) {
    fs.mkdirSync(user_templates_dir);
  }
  ret.push(user_templates_dir);

  return ret;
}

async function find_template_directory(template_name) {
  let paths = get_template_search_paths();
  for (let jj in paths) {
    let path = paths[jj];
    let files = fs.readdirSync(path);
    for (let i in files) {
      let fname = path + '/' + files[i];
      let stat0 = fs.lstatSync(fname);
      if (stat0) {
        if (stat0.isDirectory()) {
          if (files[i] == template_name) {
            return fname;
          }
        }
      }
    }
  }
  return null;
}

async function handle_run() {
  let script_name = arg2;
  if (!script_name) {
    console.error('Missing script-name argument.');
    process.exit(-1);
  }
  let workspace_name = CLP.namedParameters['workspace'];
  if (!workspace_name) {
    console.error('Missing workspace argument.');
    process.exit(-1);
  }
  let workspace_directory = get_directory_for_workspace_name(workspace_name);
  let info=readJsonSync(workspace_directory+'/info.json');
  await run_workspace_script(info.template_directory, workspace_directory, script_name);
}

async function handle_remove() {
  let workspace_name=arg2;
  if (!workspace_name) {
    console.error('Missing workspace argument.');
    process.exit(-1);
  }
  let workspace_directory=get_directory_for_workspace_name(workspace_name);
  if (!fs.existsSync(workspace_directory)) {
    console.error(`No such workspace: ${workspace_name}`);
    process.exit(-1);
  }
  let info;
  try {
    info=readJsonSync(workspace_directory+'/info.json');
  }
  catch(err) {
    console.warn('Unable to find info.json file.');
    info=null;
  }
  if (info) {
    await run_workspace_script(info.template_directory,workspace_directory,'cleanup');
  }
  await remove_workspace_directory(workspace_directory);
}

async function create_new_workspace(template_directory, workspace_name) {
  let dir = get_directory_for_workspace_name(workspace_name);
  if (fs.existsSync(dir)) {
    throw new Error(`Workspace already exists: ${workspace_name}`);
  }
  fs.mkdirSync(dir);
  try {
    await initialize_workspace(template_directory, dir);
  } catch (err) {
    await remove_workspace_directory(dir);
    throw new Error('Error initializing workspace: ' + err.message);
  }
  console.info(`New workspace created at ${dir}`);
}

function get_mlworkspace_base_dir() {
  let ret = process.env.MLWORKSPACE_BASE_DIR || process.env.HOME + '/.mlworkspace';
  if (!fs.existsSync(ret)) {
    fs.mkdirSync(ret);
  }
  return ret;
}

function get_directory_for_workspace_name(workspace_name) {
  let path = get_mlworkspace_base_dir() + '/workspaces';
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
  return path + '/' + workspace_name;
}

function is_safe_to_remove_workspace_directory(dir) {
  return dir.startsWith(get_mlworkspace_base_dir() + /workspaces/);
}

async function initialize_workspace(template_directory, workspace_directory) {
  fs.mkdirSync(workspace_directory + '/workspace');
  let info = {
    template_directory: template_directory
  };
  writeJsonSync(workspace_directory + '/info.json', info);
  await run_workspace_script(template_directory, workspace_directory, 'initialize');
}

async function run_workspace_script(template_directory, workspace_directory, script_name) {
  let obj = readJsonSync(template_directory + '/template.json');
  let scripts = obj['scripts'] || {};
  let script = scripts[script_name];
  if (!script) {
    throw new Error(`No script found in workspace template with name ${script_name}`);
  }
  for (let key in CLP.namedParameters) {
    let val=CLP.namedParameters[key];
    script=script.split('$'+key+'$').join(val)
  }
  let workspace_name=require('path').basename(workspace_directory);
  let env=process.env;
  env.WORKSPACE_DIR=workspace_directory;
  env.WORKSPACE_NAME=workspace_name;
  env.TEMPLATE_DIR=template_directory;
  await execute_script(script, {
    env: env,
    working_directory: template_directory
  });
}

async function execute_script(script, opts) {
  let env = opts.env || {};
  let exe = script.split(' ')[0];
  let args = script.split(' ').slice(1);
  return new Promise(function(resolve, reject) {
    const spawn = require('child_process').spawn;
    let P;
    try {
      let opts2 = {
        env: env,
        cwd: opts.working_directory
      };
      console.info(`Running: ${exe} ${args.join(' ')}`);
      P = spawn(exe, args, opts2);
    } catch (err) {
      reject(new Error('Error running script ' + script + ': ' + err.message));
      return;
    }
    P.stdout.on('data', (data) => {
      console.info(data.toString());
    });
    P.stderr.on('data', (data) => {
      console.info(data.toString());
    });
    P.on('close', (code) => {
      if (code != 0) {
        reject(new Error(`Script ${script} exited with non-zero exit code`));
        return;
      }
      resolve();
    });
  });
}

async function remove_workspace_directory(dir) {
  if (!is_safe_to_remove_workspace_directory(dir)) {
    console.error(`Unexpected problem: Unable to remove (unsafe) directory: ${dir}`);
    process.exit(-1);
  }
  let files = fs.readdirSync(dir);
  for (let i in files) {
    let fname = dir + '/' + files[i];
    let stat0;
    try {
      stat0 = fs.lstatSync(fname);
    }
    catch(err) {
      console.warn('Unable to stat file: '+fname);
      stat0=null;
    }
    if (stat0) {
      if ((stat0.isFile())||(stat0.isSymbolicLink())) {
        try {
          fs.unlinkSync(fname);
        }
        catch(err) {
          console.warn('Unable to remove file: '+fname);
        }
      } else if (stat0.isDirectory()) {
        await remove_workspace_directory(fname);
      }
    }
  }
  fs.rmdirSync(dir);
}

function readJsonSync(fname) {
  return JSON.parse(fs.readFileSync(fname, 'utf8'));
}

function writeJsonSync(fname, obj) {
  fs.writeFileSync(fname, JSON.stringify(obj, null, 4), 'utf8');
}

function CLParams(argv) {
  this.unnamedParameters = [];
  this.namedParameters = {};

  var args = argv.slice(2);
  for (var i = 0; i < args.length; i++) {
    var arg0 = args[i];
    if (arg0.indexOf('--') === 0) {
      arg0 = arg0.slice(2);
      var ind = arg0.indexOf('=');
      if (ind >= 0) {
        this.namedParameters[arg0.slice(0, ind)] = arg0.slice(ind + 1);
      } else {
        this.namedParameters[arg0] = '';
        if (i + 1 < args.length) {
          var str = args[i + 1];
          if (str.indexOf('-') != 0) {
            this.namedParameters[arg0] = str;
            i++;
          }
        }
      }
    } else if (arg0.indexOf('-') === 0) {
      arg0 = arg0.slice(1);
      this.namedParameters[arg0] = '';
    } else {
      this.unnamedParameters.push(arg0);
    }
  }
}