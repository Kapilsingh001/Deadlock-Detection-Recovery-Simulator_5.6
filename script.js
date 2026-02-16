
// DOM ELEMENTS 
const processInput = document.getElementById("processCount");
const resourceInput = document.getElementById("resourceCount");
const generateBtn = document.getElementById("generateBtn");

const allocationDiv = document.getElementById("allocationMatrix");
const requestDiv = document.getElementById("requestMatrix");
const availableDiv = document.getElementById("availableResources");

const resourceModelSelect = document.getElementById("resourceModel");

const detectBtn = document.getElementById("detectBtn");
const resultPanel = document.getElementById("resultPanel");
const resultText = document.getElementById("resultText");

const resetBtn=document.getElementById("resetBtn");
resetBtn.addEventListener("click",resetSystem);

const exampleBtn = document.getElementById("exampleBtn");
exampleBtn.addEventListener("click",loadExampleInput);

const terminateBtn=document.getElementById("terminateBtn");
const terminateSelect=document.getElementById("terminateSelect");

const preemptBtn = document.getElementById("preemptBtn");


terminateBtn.addEventListener("click",terminateProcess);
preemptBtn.addEventListener("click", preemptResources);



const graphArea = document.getElementById("graphArea");





let isRestoring = false;

// head restet function
function resetInternalState() {
    // Clear all runtime state
    terminatedProcesses.clear();
    waitingProcesses.clear();
    waitingManual.clear();
    waitingAuto.clear();

    snapshotStack.length = 0;
    lastDetectionResult = null;
    isRestoring = false;

    // Reset dropdown
    terminateSelect.innerHTML = '<option value="">Select process</option>';

    // Hide legend
    document.getElementById("graphLegend").style.display = "none";

    // Reset result panel
    resultPanel.className = "card";
    resultText.innerText = "Example loaded. Click Detect Deadlock.";

    updateRestoreButtonState();
}



const terminatedProcesses = new Set();
const waitingProcesses = new Set();

const waitingManual = new Set();
const waitingAuto = new Set();


const snapshotStack = [];


// correct naming
function formatProcess(p) {
    return "P" + (p + 1);
}
let activeIndicatorInput = null;
// let clearOnNextInput = null;


document.addEventListener("focusin", (e) => {
    const input = e.target;

    if (
        input.tagName !== "INPUT" ||
        input.inputMode !== "numeric"
    ) return;

    const td = input.closest("td");
    const tr = input.closest("tr");
    const table = input.closest("table");
    const card = input.closest(".card");

    if (!td || !tr || !table || !card) return;

    const indicator = card.querySelector(".cell-indicator");
    const info = indicator?.querySelector(".cellInfo");

    if (!indicator || !info) return;

    const rowIndex = [...table.rows].indexOf(tr) - 1;
    const colIndex = [...tr.children].indexOf(td) - 1;

    if (rowIndex < 0 || colIndex < 0) return;

    activeIndicatorInput = input;

    info.textContent = `P${rowIndex + 1} → R${colIndex + 1} = ${input.value}`;
    indicator.style.display = "block";
});

document.addEventListener("input", (e) => {
    if (e.target !== activeIndicatorInput) return;

    const card = e.target.closest(".card");
    if (!card) return;

    const info = card.querySelector(".cell-indicator .cellInfo");
    if (!info) return;

    const baseText = info.textContent.split("=")[0];
    info.textContent = `${baseText}= ${e.target.value}`;
});

document.addEventListener("focusout", (e) => {
    if (e.target !== activeIndicatorInput) return;

    const card = e.target.closest(".card");
    if (!card) return;

    const indicator = card.querySelector(".cell-indicator");
    if (indicator) indicator.style.display = "none";

    activeIndicatorInput = null;
});

//SMART NUMERIC INPUT HANDLING 
let previousValueMap = new WeakMap();

document.addEventListener("focusin", (e) => {
    const input = e.target;

    if (
        input.tagName === "INPUT" &&
        input.inputMode === "numeric"
    ) {
        // store previous value
        previousValueMap.set(input, input.value);

        // clear for editing
        input.value = "";
    }
});

document.addEventListener("focusout", (e) => {
    const input = e.target;

    if (
        input.tagName === "INPUT" &&
        input.inputMode === "numeric"
    ) {
        const oldValue = previousValueMap.get(input) ?? "0";

        // if user typed nothing
        if (input.value.trim() === "") {
            // restore old value (NOT force 0)
            input.value = oldValue === "" ? "0" : oldValue;
        }
    }
});











// EVENT LISTENERS
generateBtn.addEventListener("click", generateTables);
detectBtn.addEventListener("click", handleDeadlockDetection);
resourceModelSelect.addEventListener("change", handleResourceModelChange);

// TABLE GENERATION 
function generateTables() {
    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    if (isNaN(p) || isNaN(r) || p <= 0 || r <= 0) {
        alert("Please enter valid numbers for processes and resources.");
        return;
    }

    if (p > 50) {
        alert(
            "More than 50 processes detected.\n" +
            "Process–Resource Graph will be used during detection."
        );
    }
    logEvent(`System configured | Processes=${p} Resources=${r}`,"INFO");

    createMatrix(allocationDiv, p, r);
    createMatrix(requestDiv, p, r);
    createAvailableInputs(availableDiv, r);
}



function createMatrix(container, rows, cols) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.border = "1";

    const headerRow = document.createElement("tr");
    const emptyCell = document.createElement("th");
    emptyCell.innerText = "P / R";
    headerRow.appendChild(emptyCell);

    for (let j = 0; j < cols; j++) {
        const th = document.createElement("th");
        th.innerText = "R" + (j + 1);
        headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    for (let i = 0; i < rows; i++) {
        const tr = document.createElement("tr");

        const processCell = document.createElement("th");
        processCell.innerText = "P" + (i + 1);
        tr.appendChild(processCell);

        for (let j = 0; j < cols; j++) {
            const td = document.createElement("td");
            const input = document.createElement("input");
        input.type = "text";                 
        input.inputMode = "numeric";        
        input.pattern = "[0-9]*";            
         input.value = "0";

        
            td.appendChild(input);
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }
    container.appendChild(table);
}

function createAvailableInputs(container, count) {
    container.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const wrapper = document.createElement("div");
        wrapper.style.marginBottom = "8px";

        const label = document.createElement("label");
        label.textContent = "R" + (i + 1) + ": ";

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.pattern = "[0-9]*";
        input.value = "0";

       

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    }
}

//  READ INPUT 
function readMatrix(container, rows, cols) {
    const matrix = [];
    const inputs = container.querySelectorAll("input");
    let index = 0;

    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            const val = parseInt(inputs[index].value);
            row.push(isNaN(val) ? 0 : val);
            index++;
        }
        matrix.push(row);
    }
    return matrix;
}

function readAvailable(container, count) {
    const available = [];
    const inputs = container.querySelectorAll("input");

    for (let i = 0; i < count; i++) {
        const val = parseInt(inputs[i].value);
        available.push(isNaN(val) ? 0 : val);
    }
    return available;
}

//  WAIT-FOR GRAPH
function drawWaitForGraph(graph, cycle = []) {

    document.getElementById("graphLegend").style.display = "flex";

    const graphArea = document.getElementById("graphArea");
    graphArea.innerHTML = "";

    // Collect active processes
    const activeProcesses = [];
    for (let key in graph) {
        const p = Number(key);
        if (!terminatedProcesses.has(p)) {
            activeProcesses.push(p);
        }
    }

    const total = activeProcesses.length;

    if (total === 0) {
        graphArea.innerText = "No active processes.";
        return;
    }

    //LAYOUT CONFIG 

    const radius = 22;
    const gap = 30;

    const MAX_RADIUS_20 = 280;

    let layoutRadius;

    if (total <= 6) {
        layoutRadius = 180;
    } else if (total <= 10) {
        layoutRadius = 220;
    } else if (total <= 20) {
        layoutRadius = MAX_RADIUS_20;
    } else {
        layoutRadius = Math.max(
            MAX_RADIUS_20,
            (total * (radius * 2 + gap)) / (2 * Math.PI)
        );
    }

    const padding = 80;
    const width = layoutRadius * 2 + padding;

    const cx = width / 2;
    const cy = width / 2; 

   // SVG 

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    
const defs = document.createElementNS(svg.namespaceURI,"defs");

const marker = document.createElementNS(svg.namespaceURI,"marker");

marker.setAttribute("id","arrowRequest");
marker.setAttribute("viewBox","0 0 10 10");
marker.setAttribute("refX","8");   // adjust arrow position
marker.setAttribute("refY","5");
marker.setAttribute("markerWidth","6");
marker.setAttribute("markerHeight","6");
marker.setAttribute("orient","auto-start-reverse");

const path = document.createElementNS(svg.namespaceURI,"path");
path.setAttribute("d","M 0 0 L 10 5 L 0 10 z");
path.setAttribute("fill","context-stroke");// inherit stroke color

marker.appendChild(path);
defs.appendChild(marker);
svg.appendChild(defs);


    svg.setAttribute("width", width);
    svg.style.display = "block";
    svg.style.margin = "auto";

    const positions = {};

    // NODE POSITIONS

    for (let i = 0; i < total; i++) {
        const pId = activeProcesses[i];
        const angle = (2 * Math.PI * i) / total;

        positions[pId] = {
            x: cx + layoutRadius * Math.cos(angle),
            y: cy + layoutRadius * Math.sin(angle)
        };
    }

    //AUTO-FIT SVG 

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let pId of activeProcesses) {
        const { x, y } = positions[pId];
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }

    const fitPadding = 40;

    minX -= fitPadding;
    minY -= fitPadding;
    maxX += fitPadding;
    maxY += fitPadding;

    const contentWidth  = maxX - minX;
    const contentHeight = maxY - minY;

    // REMOVE ALL EMPTY SPACE
    svg.setAttribute(
        "viewBox",
        `${minX} ${minY} ${contentWidth} ${contentHeight}`
    );
    svg.setAttribute("height", contentHeight);

    // DRAW EDGES 

    for (let fromKey in graph) {
        const from = Number(fromKey);
        if (terminatedProcesses.has(from)) continue;

        for (let to of graph[from]) {
            if (terminatedProcesses.has(to)) continue;

            const line = document.createElementNS(svg.namespaceURI, "line");
            line.setAttribute("marker-end", "url(#arrowRequest)");

            const dx = positions[to].x - positions[from].x;
const dy = positions[to].y - positions[from].y;

const length = Math.sqrt(dx*dx + dy*dy);

// circle radius = 22 (your value)
const offset = 22;

const newX2 = positions[to].x - (dx / length) * offset;
const newY2 = positions[to].y - (dy / length) * offset;

line.setAttribute("x1", positions[from].x);
line.setAttribute("y1", positions[from].y);
line.setAttribute("x2", newX2);
line.setAttribute("y2", newY2);


            line.setAttribute("stroke-linecap","round");
            line.setAttribute("stroke-linejoin","round");  


            if (cycle.includes(from) && cycle.includes(to)) {
                line.setAttribute("stroke", "red");
                line.setAttribute("stroke-width", "3");
            } else {
                line.setAttribute("stroke", "#555");
                line.setAttribute("stroke-width", "2");
            }

            svg.appendChild(line);
        }
    }

    // DRAW NODES 

    for (let p of activeProcesses) {

        const circle = document.createElementNS(svg.namespaceURI, "circle");
        circle.setAttribute("cx", positions[p].x);
        circle.setAttribute("cy", positions[p].y);
        circle.setAttribute("r", radius);

        if (cycle.includes(p)) {
            circle.setAttribute("fill", "#ffcdd2");
            circle.setAttribute("stroke", "red");
        } else if (waitingProcesses.has(p)) {
            circle.setAttribute("fill", "#fff9c4");
            circle.setAttribute("stroke", "#f9a825");
        } else {
            circle.setAttribute("fill", "#e3f2fd");
            circle.setAttribute("stroke", "#1976d2");
        }

        circle.setAttribute("stroke-width", "2");

        const text = document.createElementNS(svg.namespaceURI, "text");
        text.setAttribute("x", positions[p].x);
        text.setAttribute("y", positions[p].y + 5);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "13");
        text.textContent = formatProcess(p);

        svg.appendChild(circle);
        svg.appendChild(text);
    }

    graphArea.appendChild(svg);

    logEvent("Graph rendered", "DEBUG");

    // AUTO CENTER SCROLL

    const scroll = graphArea.closest(".graph-scroll");
    if (scroll) {
        scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
    }
}


// DFS CYCLE DETECTION
function dfsDetectCycle(node, graph, visited, recStack, path) {
    visited[node] = true;
    recStack[node] = true;
    path.push(node);

    for (let neighbor of graph[node]) {
        if (!visited[neighbor]) {
            const cycle = dfsDetectCycle(
                neighbor,
                graph,
                visited,
                recStack,
                path
            );
            if (cycle) return cycle;
        }
        else if (recStack[neighbor]) {
            const startIndex = path.indexOf(neighbor);
            if (startIndex !== -1) {
                return path.slice(startIndex);
            }
        }
    }

    recStack[node] = false;
    path.pop();
    return null;
}

function detectDeadlock(graph) {
    const visited = {};
    const recStack = {};

    for (let node in graph) {
        visited[node] = false;
        recStack[node] = false;
    }

    for (let node in graph) {
        if (!visited[node]) {
            const cycle = dfsDetectCycle(
                Number(node),
                graph,
                visited,
                recStack,
                []
            );
            if (cycle) {
                return { deadlock: true, cycle };
            }
        }
    }

    return { deadlock: false, cycle: [] };
}
function buildWaitForGraph(allocation, request, available, resourceModel) {
    const graph = {};
    const p = allocation.length;
    const r = allocation[0].length;

    for (let i = 0; i < p; i++) {
        graph[i] = [];
    }

    for (let i = 0; i < p; i++) {
        for (let j = 0; j < r; j++) {

            if (request[i][j] <= 0) continue;

            if (
                resourceModel === "multiple" &&
                request[i][j] <= available[j]
            ) continue;

            for (let k = 0; k < p; k++) {
                if (k !== i && allocation[k][j] > 0) {
                    if (!graph[i].includes(k)) {
                        graph[i].push(k);
                    }
                }
            }
        }
    }
    return graph;
}

// MAIN HANDLER
function handleDeadlockDetection() {

   

    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);
    if (isNaN(p) || isNaN(r)) return;

    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);
    const resourceModel = resourceModelSelect.value;

     logEvent(
    `Detection started | P=${p} R=${r} Mode=${resourceModel}`,
    "INFO"
);


    let result;

    //MULTIPLE INSTANCE 
    if (resourceModel === "multiple") {

        result = detectDeadlockMultipleInstance(
            allocation,
            request,
            available
        );
        lastDetectionResult = result;

        if (!result.deadlock) {
        waitingAuto.clear();
    }
        


        // recompute auto-waiting ONLY if not restoring
        if (!isRestoring && result.deadlock) {
            waitingAuto.clear();

            for (let i = 0; i < p; i++) {
                if (terminatedProcesses.has(i)) continue;
                if (waitingManual.has(i)) continue;
                if (result.deadlockedProcesses.includes(i)) continue;

                for (let j = 0; j < r; j++) {
                    if (request[i][j] > available[j]) {
                        waitingAuto.add(i);
                         logEvent(`${formatProcess(i)} waiting (resource unavailable)`,"INFO");
                        break;
                    }
                }
            }
        }

        updateResultUIMultiple(result);

        const depGraph =
            buildProcessResourceDependencyGraph(request, available);

        drawMultiInstanceGraph(depGraph, result.deadlockedProcesses);

        if (result.deadlock) {
            rebuildTerminateDropdown(result.deadlockedProcesses);
        }
       updateRestoreButtonState();



        updateSystemFinalState(result);
        return;
    }
    //  LARGE SYSTEM → FORCE PROCESS-RESOURCE GRAPH
if (p > 50) {
    const depGraph = buildProcessResourceDependencyGraph(request, available);

    drawMultiInstanceGraph(depGraph, []);

    resultPanel.className = "card";
    resultText.innerHTML = `
        <strong>Large System Detected</strong><br><br>
        For more than 50 processes, a Process–Resource Graph is used
        to maintain clarity and performance.
    `;

    updateSystemFinalState({ deadlock: false });
    return;
}


    //SINGLE INSTANCE
    const graph = buildWaitForGraph(
        allocation,
        request,
        available,
        "single"
    );

    result = detectDeadlock(graph);
    lastDetectionResult = result;


    updateResultUI(result);
    drawWaitForGraph(graph, result.cycle);

   updateRestoreButtonState();



    updateSystemFinalState(result);
}

//  UI UPDATE 

function updateResultUI(result) {

    // reset panel style
    resultPanel.className = "card";

    // always reset dropdown
    terminateSelect.innerHTML = '<option value="">Select process</option>';

    //  DEADLOCK CASE
    if (result.deadlock) {

        logEvent("Deadlock detected", "ERROR");

         logEvent(`Deadlock cycle: ${result.cycle.map(p => formatProcess(p)).join("->")}`, "ERROR");

        

        resultPanel.classList.add("deadlock");

        const cycleText = result.cycle
            .map(p =>  formatProcess(p))
            .join(" → ");

        resultText.innerHTML = `
            <strong>DEADLOCK DETECTED</strong><br><br>
            <strong>Reason:</strong><br>
            Circular wait exists among ${cycleText}.<br>
            Each process holds a resource required by the next.
        `;

        // remove duplicates using Set
        const uniqueProcesses = new Set(result.cycle);

        for (let p of uniqueProcesses) {

            // skip invalid recovery candidates
            if (terminatedProcesses.has(p) || waitingProcesses.has(p)) continue;

            const option = document.createElement("option");
            option.value = p;
            option.textContent = formatProcess(p);
            terminateSelect.appendChild(option);
        }

        return;
    }
    


    //  SAFE BUT WAITING CASE
    if (waitingProcesses.size > 0) {
        resultPanel.classList.add("waiting");

        const waitingText = [...waitingProcesses].map(p => formatProcess(p)).join(", ");

        resultText.innerHTML = `
            <strong>SAFE STATE (WITH WAITING)</strong><br><br>
            Processes waiting: ${waitingText}.<br>
            The system is not deadlocked because no circular wait exists.<br>
            Progress is possible when resources are released.
        `;

        return;
    }

    //  SAFE & NO WAITING
    logEvent("Deadlock resolved successfully", "SUCCESS");


    resultPanel.classList.add("safe");

    resultText.innerHTML = `
        <strong>SAFE STATE</strong><br><br>
        All process requests can be satisfied with available resources.<br>
        No waiting or circular dependency exists.
    `;
}


//  SVG GRAPH


//reset
function resetSystem() {
    // systemSnapShot = null;
    // snapshotLocked = false;
    logEvent("=== New simulation session started ===", "INFO");



    


     snapshotStack.length = 0;     //  clear undo history
    lastDetectionResult = null;   //  reset detection memory
    isRestoring = false;

    
   updateRestoreButtonState();


    waitingManual.clear();
waitingAuto.clear();


    document.getElementById("graphLegend").style.display = "none";


    // Clear inputs
    processInput.value = "";
    resourceInput.value = "";

    // Clear matrices
    allocationDiv.innerHTML = "";
    requestDiv.innerHTML = "";
    availableDiv.innerHTML = "";

    // Reset result panel
    resultPanel.className = "card";
    resultText.innerText = "Waiting for input...";

    // Clear graph
    document.getElementById("graphArea").innerHTML = "Graph will appear here";

    //  Clear process states
    terminatedProcesses.clear();
    waitingProcesses.clear();

    // Reset dropdown (ONLY placeholder remains)
    terminateSelect.innerHTML = '<option value="">Select process</option>';

    // Clear final system state
    const finalText = document.getElementById("finalStateText");
    if (finalText) {
        finalText.innerText = "";
    }
}


//example
function loadExampleInput() {

    


    //  FULL RESET FIRST
    resetInternalState();

    // Set system size
    processInput.value = 5;
    resourceInput.value = 4;

    generateTables();

    // Allocation
    const allocInputs = allocationDiv.querySelectorAll("input");
    allocInputs[0].value = 1;
    allocInputs[5].value = 1;
    allocInputs[10].value = 1;
    allocInputs[15].value = 1;

    // Request
    const reqInputs = requestDiv.querySelectorAll("input");
    reqInputs[1].value = 1;
    reqInputs[6].value = 1;
    reqInputs[11].value = 1;
    reqInputs[12].value = 1;
    reqInputs[16].value = 1;

    // Available
    const availInputs = availableDiv.querySelectorAll("input");
    availInputs.forEach(input => input.value = 0);

    // Reset UI text
    resultPanel.className = "card";
    resultText.innerText = "Example loaded. Click Detect Deadlock.";

    logEvent("Example input loaded", "INFO");

    
    handleDeadlockDetection();
}



// process termination--->1) update ->udateResultUI

function terminateProcess() {
    if (terminateSelect.value === "") {
        alert("No process selected.");
        return;
    }

    //   snapshot BEFORE recovery action
    if (!isRestoring) {
        snapshotStack.push(createSnapshot(lastDetectionResult || { deadlock: false }));
        updateRestoreButtonState();
    }

    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);
    const kill = parseInt(terminateSelect.value);

    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);

    for (let j = 0; j < r; j++) {
        available[j] += allocation[kill][j];
        allocation[kill][j] = 0;
        request[kill][j] = 0;
    }

    writeMatrix(allocationDiv, allocation);
    writeMatrix(requestDiv, request);
    writeAvailable(availableDiv, available);

    terminatedProcesses.add(kill);
    waitingProcesses.delete(kill);

    


    resultText.innerText = `Process ${formatProcess(kill)} terminated. Resources released.`;
    logEvent(`Process ${formatProcess(kill)} terminated | Resources released`,"WARNING");


    handleDeadlockDetection();
}



function preemptResources() {
    if (terminateSelect.value === "") {
        alert("No process selected.");
        return;
    }

    //  ALWAYS snapshot BEFORE recovery action
    if (!isRestoring) {
        snapshotStack.push(createSnapshot(lastDetectionResult || { deadlock: false }));
        updateRestoreButtonState();
    }

    const victim = parseInt(terminateSelect.value);
    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    const allocation = readMatrix(allocationDiv, p, r);
    const request = readMatrix(requestDiv, p, r);
    const available = readAvailable(availableDiv, r);

    for (let j = 0; j < r; j++) {
        available[j] += allocation[victim][j];
        allocation[victim][j] = 0;
        request[victim][j] = 0;
    }

    writeMatrix(allocationDiv, allocation);
    writeMatrix(requestDiv, request);
    writeAvailable(availableDiv, available);

    if (resourceModelSelect.value === "single") {
        waitingProcesses.add(victim);
    } else {
        waitingManual.add(victim);
        waitingAuto.delete(victim);
    }

    resultPanel.className = "card waiting";
    resultText.innerText = `Resources preempted from ${formatProcess(victim)}. Process moved to WAITING state.`;
    logEvent(`Resources preempted from ${formatProcess(victim)}`, "WARNING");


    handleDeadlockDetection();
}



//Helper code

function writeMatrix(container, matrix) {
    const inputs = container.querySelectorAll("input");
    let index = 0;

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            inputs[index].value = matrix[i][j];
            index++;
        }
    }
}

function writeAvailable(container, available) {
    const inputs = container.querySelectorAll("input");
    for (let i = 0; i < available.length; i++) {
        inputs[i].value = available[i];
    }
}


// final system state

function updateSystemFinalState(result){

    const p=parseInt(processInput.value);
    const r=parseInt(resourceInput.value);

    const available=readAvailable(availableDiv,r);
    const finalText=document.getElementById("finalStateText");

    let output = "";
    //system state

    if(result.deadlock){
        output += "System Status: DEADLOCK EXISTS\n\n";
    }else{
         output += "System Status: SAFE\n\n";
    }
    //process state

    output += "Process States:\n";

   for(let i=0;i<p;i++){

    if(terminatedProcesses.has(i)){
        output += formatProcess(i) + " → TERMINATED\n";
        continue;
    }
    else if (resourceModelSelect.value === "multiple" &&result.deadlock &&result.deadlockedProcesses.includes(i)) {
        output += formatProcess(i) + " → WAITING (DEADLOCK)\n";
    }
    else if (waitingManual.has(i)) {
        output += formatProcess(i) + " → WAITING (PREEMPTED)\n";
    }
    else if (waitingAuto.has(i)) {
        output += formatProcess(i) + " → WAITING (RESOURCE)\n";
    }
    else if (resourceModelSelect.value === "single" && waitingProcesses.has(i)) {
        output += formatProcess(i) + " → WAITING\n";
    }
    else {
        output += formatProcess(i) + " → RUNNING\n";
    }


}


    // Available Resources
    output += "\nAvailable Resources:\n";

    for(let j=0;j<r;j++){
        output+="R"+(j+1)+" = "+available[j];
        
        if (j < r - 1) output += ", ";
    }


output += "\n\nRecovery Actions:\n";

if (result.deadlock) {
    output += "• Deadlock detected\n";
}

// Terminations
for (let p of terminatedProcesses) {
    output += "• " + formatProcess(p) + " terminated\n";
}

// Preemptions (SINGLE instance)
for (let p of waitingProcesses) {
    output += "• " + formatProcess(p) + " preempted\n";
}

// Preemptions (MULTIPLE instance – manual)
for (let p of waitingManual) {
    output += "• " + formatProcess(p)+ " preempted (manual)\n";
}


finalText.innerText = output;

}

// Extra

window.addEventListener("load", () => {
  // Start with clean UI
  logEvent("User session started", "INFO"); 

  resultText.innerText = "Configure system and detect deadlock.";
});




// rebuild-->
function rebuildTerminateDropdown(cycle) {

    terminateSelect.innerHTML = '<option value="">Select process</option>';

    const unique = new Set(cycle);

    for (let p of unique) {
        if (terminatedProcesses.has(p)) continue;

        const option = document.createElement("option");
        option.value = p;
        option.textContent = formatProcess(p);
        terminateSelect.appendChild(option);
    }
}

// multiple instance correction
// 1.
function detectDeadlockMultipleInstance(allocation, request, available) {

    const p = allocation.length;
    const r = allocation[0].length;

    const work = [...available];
    const finish = new Array(p).fill(false);

    const safeSequence = [];

    let progress;

    do {
        progress = false;

        for (let i = 0; i < p; i++) {

            if (finish[i]) continue;

            let canProceed = true;

            for (let j = 0; j < r; j++) {
                if (request[i][j] > work[j]) {
                    canProceed = false;
                    break;
                }
            }

            if (canProceed) {

                for (let j = 0; j < r; j++) {
                    work[j] += allocation[i][j];
                }

                finish[i] = true;
                safeSequence.push(i);   
                progress = true;
            }
        }

    } while (progress);

    const deadlocked = [];

    for (let i = 0; i < p; i++) {
        if (!finish[i]) deadlocked.push(i);
    }

    return {
        deadlock: deadlocked.length > 0,
        deadlockedProcesses: deadlocked,
        safeSequence: safeSequence      
    };
}


// 2.
function updateResultUIMultiple(result) {

    resultPanel.className = "card";
    terminateSelect.innerHTML = '<option value="">Select process</option>';

    if (result.deadlock) {

        logEvent(
            `Deadlock detected (multiple instance) — ${result.deadlockedProcesses.length} process(es) blocked`,
            "ERROR"
        );

        resultPanel.classList.add("deadlock");

        const list = result.deadlockedProcesses
            .map(p => formatProcess(p))
            .join(", ");

        resultText.innerHTML = `
            <strong>DEADLOCK DETECTED (MULTI-INSTANCE)</strong><br><br>
            Processes unable to proceed: ${list}<br>
            Reason: Requests exceed available resource instances.
        `;

        for (let p of result.deadlockedProcesses) {
            const option = document.createElement("option");
            option.value = p;
            option.textContent = formatProcess(p);
            terminateSelect.appendChild(option);
        }

        return;
    }

    logEvent("System is safe (multiple instance)", "SUCCESS");

    resultPanel.classList.add("safe");

    const seq = result.safeSequence
    .map(p => formatProcess(p))
    .join(" → ");

    resultText.innerHTML = `
        <strong>SAFE STATE</strong><br><br>
        All process requests can be satisfied.<br><br>

        <strong>SAFE SEQUENCE:</strong><br>
        ${seq}
    `;

}


// 3.
function buildProcessResourceDependencyGraph(request, available) {
    const graph = {};
    const p = request.length;
    const r = request[0].length;

    for (let i = 0; i < p; i++) {
        graph[i] = [];
        for (let j = 0; j < r; j++) {
            if (request[i][j] > available[j]) {
                graph[i].push(j); // Pi → Rj
            }
        }
    }
    return graph;
}

function drawMultiInstanceGraph(depGraph, deadlockedProcesses = []) {

    document.getElementById("graphTitle").innerText =
        "Process–Resource Graph (Multiple Instance)";

    document.getElementById("graphLegend").style.display = "flex";

    const deadlockedSet = new Set(deadlockedProcesses);

    const graphArea = document.getElementById("graphArea");
    graphArea.innerHTML = "";

    const p = Object.keys(depGraph).length;
    const r = Math.max(...Object.values(depGraph).flat(), -1) + 1;

    //LAYOUT 

    const spacing = Math.max(90, Math.min(140, 6000 / Math.max(p, 1)));
    const padding = 120;

    const width = Math.max(
        window.innerWidth,
        padding * 2 + Math.max(p, r) * spacing
    );

    const height = 360;

    const processY = 90;
    const resourceY = 250;

    //SVG 

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    // Arrow Definitions
const defs = document.createElementNS(svg.namespaceURI, "defs");

// RED request arrow
const markerRequest = document.createElementNS(svg.namespaceURI, "marker");
markerRequest.setAttribute("id", "arrowRequest");
markerRequest.setAttribute("markerWidth", "10");
markerRequest.setAttribute("markerHeight", "10");
markerRequest.setAttribute("refX", "10");
markerRequest.setAttribute("refY", "3");
markerRequest.setAttribute("orient", "auto");

const pathReq = document.createElementNS(svg.namespaceURI, "path");
pathReq.setAttribute("d", "M0,0 L0,6 L9,3 z");
pathReq.setAttribute("fill", "#c62828");

markerRequest.appendChild(pathReq);
defs.appendChild(markerRequest);

// GREEN allocation arrow
const markerAlloc = document.createElementNS(svg.namespaceURI, "marker");
markerAlloc.setAttribute("id", "arrowAllocation");
markerAlloc.setAttribute("markerWidth", "10");
markerAlloc.setAttribute("markerHeight", "10");
markerAlloc.setAttribute("refX", "10");
markerAlloc.setAttribute("refY", "3");
markerAlloc.setAttribute("orient", "auto");

const pathAlloc = document.createElementNS(svg.namespaceURI, "path");
pathAlloc.setAttribute("d", "M0,0 L0,6 L9,3 z");
pathAlloc.setAttribute("fill", "#2e7d32");

markerAlloc.appendChild(pathAlloc);
defs.appendChild(markerAlloc);

svg.appendChild(defs);

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.style.display = "block";

    // POSITIONS 

    const processPos = {};
    const resourcePos = {};

    //PROCESSES

    for (let i = 0; i < p; i++) {
        const x = padding + i * spacing;

        processPos[i] = { x, y: processY };

        const c = document.createElementNS(svg.namespaceURI, "circle");
        c.setAttribute("cx", x);
        c.setAttribute("cy", processY);
        c.setAttribute("r", 20);

        if (deadlockedSet.has(i)) {
            c.setAttribute("fill", "#ffcdd2");
            c.setAttribute("stroke", "#c62828");
        } else if (waitingManual.has(i)) {
            c.setAttribute("fill", "#fff9c4");
            c.setAttribute("stroke", "#f9a825");
        } else if (waitingAuto.has(i)) {
            c.setAttribute("fill", "#ffe0b2");
            c.setAttribute("stroke", "#ef6c00");
        } else {
            c.setAttribute("fill", "#e3f2fd");
            c.setAttribute("stroke", "#1976d2");
        }

        c.setAttribute("stroke-width", "2");
        svg.appendChild(c);

        const t = document.createElementNS(svg.namespaceURI, "text");
        t.setAttribute("x", x);
        t.setAttribute("y", processY + 5);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "12");
        t.textContent = formatProcess(i);
        svg.appendChild(t);
    }

    //RESOURCES 

    for (let j = 0; j < r; j++) {
        const x = padding + j * spacing;

        resourcePos[j] = { x, y: resourceY };

        const rect = document.createElementNS(svg.namespaceURI, "rect");
        rect.setAttribute("x", x - 20);
        rect.setAttribute("y", resourceY - 20);
        rect.setAttribute("width", 40);
        rect.setAttribute("height", 40);
        rect.setAttribute("rx", 6);
        rect.setAttribute("fill", "#e8f5e9");
        rect.setAttribute("stroke", "#2e7d32");
        rect.setAttribute("stroke-width", "2");
        svg.appendChild(rect);

        const t = document.createElementNS(svg.namespaceURI, "text");
        t.setAttribute("x", x);
        t.setAttribute("y", resourceY + 5);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "12");
        t.textContent = "R" + (j + 1);
        svg.appendChild(t);
    }

    //EDGES 

    for (let i in depGraph) {
        for (let j of depGraph[i]) {
            const line = document.createElementNS(svg.namespaceURI, "line");
            line.setAttribute("x1", processPos[i].x);
            line.setAttribute("y1", processPos[i].y + 20);
            line.setAttribute("x2", resourcePos[j].x);
            line.setAttribute("y2", resourcePos[j].y - 20);
            line.setAttribute("stroke", "#c62828");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("marker-end", "url(#arrowRequest)");

            svg.appendChild(line);
        }
    }

    
const allocation = readMatrix(allocationDiv, p, r);

for(let i=0;i<p;i++){
  for(let j=0;j<r;j++){
    if(allocation[i][j] > 0){

      const allocLine = document.createElementNS(svg.namespaceURI,"line");

      allocLine.setAttribute("x1", resourcePos[j].x);
      allocLine.setAttribute("y1", resourcePos[j].y - 20);
      allocLine.setAttribute("x2", processPos[i].x);
      allocLine.setAttribute("y2", processPos[i].y + 20);

      allocLine.setAttribute("stroke","#2e7d32");
      allocLine.setAttribute("stroke-width","2");

      allocLine.setAttribute("marker-end","url(#arrowAllocation)");

      svg.appendChild(allocLine);
    }
  }
}

    graphArea.appendChild(svg);

    logEvent("Graph rendered", "DEBUG");

    //AUTO CENTER 

    const scroll = graphArea.closest(".graph-scroll") || graphArea;
    scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
}


//  SNAPSHOT HELPERS 

function createSnapshot(result) {
    const p = parseInt(processInput.value);
    const r = parseInt(resourceInput.value);

    return {
        allocation: readMatrix(allocationDiv, p, r),
        request: readMatrix(requestDiv, p, r),
        available: readAvailable(availableDiv, r),

        resourceModel: resourceModelSelect.value,

        terminated: new Set(terminatedProcesses),
        waitingSingle: new Set(waitingProcesses),
        waitingManual: new Set(waitingManual),
        waitingAuto: new Set(waitingAuto),

        deadlock: result.deadlock,
        cycle: result.cycle || [],
        deadlockedProcesses: result.deadlockedProcesses || []
    };
}



// recovery

document.getElementById("restoreBtn")
    .addEventListener("click", undoLastRecoveryStep);




function undoLastRecoveryStep() {

    
if (snapshotStack.length === 0) {
    return;
}

logEvent("Undo last recovery step", "INFO");


    isRestoring = true;

    const snapshot = snapshotStack.pop();


    // 1️ Restore matrices
    writeMatrix(allocationDiv, snapshot.allocation);
    writeMatrix(requestDiv, snapshot.request);
    writeAvailable(availableDiv, snapshot.available);

    // 2️ Restore process states
    terminatedProcesses.clear();
    waitingProcesses.clear();
    waitingManual.clear();
    waitingAuto.clear();

    snapshot.terminated.forEach(p => terminatedProcesses.add(p));
    snapshot.waitingSingle.forEach(p => waitingProcesses.add(p));
    snapshot.waitingManual.forEach(p => waitingManual.add(p));
    snapshot.waitingAuto.forEach(p => waitingAuto.add(p));

    // 3️ Restore model
    resourceModelSelect.value = snapshot.resourceModel;

    document.getElementById("graphLegend").style.display = "flex";

    // 4️ Redraw graph from snapshot
    if (snapshot.resourceModel === "multiple") {

        const depGraph = buildProcessResourceDependencyGraph(
            snapshot.request,
            snapshot.available
        );

        drawMultiInstanceGraph(depGraph, snapshot.deadlockedProcesses);
        updateResultUIMultiple(snapshot);

    } else {

        const graph = buildWaitForGraph(
            snapshot.allocation,
            snapshot.request,
            snapshot.available,
            "single"
        );

        drawWaitForGraph(graph, snapshot.cycle);
        updateResultUI(snapshot);
    }

    updateSystemFinalState(snapshot);

    
    lastDetectionResult = {
        deadlock: snapshot.deadlock,
        cycle: snapshot.cycle || [],
        deadlockedProcesses: snapshot.deadlockedProcesses || []
    };

    // 5️ Rebuild recovery dropdown if deadlock still exists
    if (snapshot.deadlock) {
        if (snapshot.resourceModel === "multiple") {
            rebuildTerminateDropdown(snapshot.deadlockedProcesses);
        } else {
            rebuildTerminateDropdown(snapshot.cycle);
        }
    }

   
    isRestoring = false;
updateRestoreButtonState();
logEvent("System state restored successfully", "SUCCESS");


    


}


// helper
function updateRestoreButtonState() {
    const btn = document.getElementById("restoreBtn");
    btn.disabled = snapshotStack.length === 0;
}


function handleResourceModelChange() {

      if (resourceModelSelect.value === "single") {
        logEvent("Mode changed to Single Instance deadlock detection", "INFO");
    } else {
        logEvent("Mode changed to Multiple Instance (Banker-style) detection", "INFO");
    }


    snapshotStack.length = 0;   //  clear undo history
    lastDetectionResult = null;
    isRestoring = false;

    terminatedProcesses.clear();
    waitingProcesses.clear();
    waitingManual.clear();
    waitingAuto.clear();

    terminateSelect.innerHTML = '<option value="">Select process</option>';

    document.getElementById("graphArea").innerHTML = "Graph will appear here";
    document.getElementById("graphLegend").style.display = "none";

    resultPanel.className = "card";
    resultText.innerText =
        "Resource model changed. Configure system and detect deadlock.";

    updateRestoreButtonState();
}





  // GRAPH FULLSCREEN + ZOOM.


const graphModal = document.getElementById("graphModal");
const graphModalArea = document.getElementById("graphModalArea");
const fullscreenBtn = document.getElementById("graphFullscreenBtn");
const closeGraphModal = document.getElementById("closeGraphModal");
const graphZoom = document.getElementById("graphZoom");

fullscreenBtn.addEventListener("click", () => {
    const svg = graphArea.querySelector("svg");
    if (!svg) return;

    // move SVG into modal
    graphModalArea.innerHTML = "";
    graphModalArea.appendChild(svg);

    // reset zoom
    graphZoom.value = 100;
    svg.style.transform = "scale(1)";
    svg.style.transformOrigin = "center center";

    graphModal.classList.add("show");
});

closeGraphModal.addEventListener("click", () => {
    const svg = graphModalArea.querySelector("svg");
    if (!svg) return;

    // reset zoom
    svg.style.transform = "scale(1)";
    graphZoom.value = 100;

    // move back
    graphModalArea.innerHTML = "";
    graphArea.appendChild(svg);

    graphModal.classList.remove("show");
});

graphZoom.addEventListener("input", () => {
    const svg = graphModalArea.querySelector("svg");
    if (!svg) return;

    svg.style.transform = `scale(${graphZoom.value / 100})`;
    svg.style.transformOrigin = "center center";
});



// create simple user id (browser session)
const userId = localStorage.getItem("deadlockUser")
    || crypto.randomUUID();

localStorage.setItem("deadlockUser", userId);

//  CLOUD LOG FETCH
async function loadCloudLogs() {
    try {
        const res = await fetch(
    `https://deadlock-cloud-logs.onrender.com/logs/${userId}`
);

        const logs = await res.json();

        const logBox = document.getElementById("cloudLogs");
        if (!logBox) return;

        // If no logs yet
        if (!Array.isArray(logs) || logs.length === 0) {
            logBox.textContent = "No logs yet...";
            return;
        }

        let output = "";

        for (const log of logs) {
            output += `[${log.time}] ${log.level}: ${log.message}\n`;
        }

        logBox.textContent = output;

        // Auto-scroll to bottom
        logBox.scrollTop = logBox.scrollHeight;

    } catch (err) {
        console.error("Cloud fetch error:", err);
    }
}

// Load once on page load
loadCloudLogs();

// Refresh every 5 seconds
setInterval(loadCloudLogs, 5000);




function logEvent(message, level = "INFO") {

    fetch("https://deadlock-cloud-logs.onrender.com/log", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: userId,  
            message: message,
            level: level
        })
    }).catch(err => console.error("Log failed:", err));
}
