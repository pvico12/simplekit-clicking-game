import { startSimpleKit, setSKDrawCallback, setSKEventListener, addSKEventTranslator, FundamentalEvent, SKResizeEvent, SKMouseEvent, SKEvent } from "simplekit/canvas-mode";

startSimpleKit();

enum GameMode {
    SETUP,
    PLAY,
    END
}

enum DialationFunction {
    SINE,
    COSINE
}

interface Node {
    id: number;
    x: number;
    y: number;
    angle: number;
    radius: number;
    activeTarget: boolean;
    fillStyle: string;
    dialationTrigFunction: DialationFunction;
}


let CANVAS_WIDTH = 0;
let CANVAS_HEIGHT = 0;
let TITLE_HEADER_HEIGHT = 50;
let MIN_NODE_RADIUS = 15;
let MAX_NODE_RADIUS = 45;
let DEFAULT_NODE_COUNT = 6;
let MIN_NODE_COUNT = 3;
let MAX_NODE_COUNT = 8;
let DEFAULT_ROTATION_SPEED = 5;
let MIN_ROTATION_SPEED = 1;
let MAX_ROTATION_SPEED = 10;
let DEFAULT_DIALATION_DURATION = 3.6;
let CLICK_ANIMATION_DURATION = 1/3;
let CLICK_ANIMATION_STARTING_RADIUS = 15;
let CLICK_ANIMATION_ENDING_RADIUS = 45;
let DEFAULT_CANVAS_BACKGROUND_COLOUR = "black";
let INCORRECT_TARGET_CLICK_CANVAS_BACKGROUND_COLOUR = "darkred";
let ACTIVE_TARGET_NODE_COLOUR = "white";
let INACTIVE_TARGET_NODE_COLOUR = "darkgrey";

let APPLY_DILATION = true;

// visual variables
let headerText = "click target 1 to begin";
let hoveredNodeIndex = -1;
let canvasBackgroundColour = DEFAULT_CANVAS_BACKGROUND_COLOUR;
let clickAnimationStartTime : number | null = null;
let clickAnimationCoordX = 0;
let clickAnimationCoordY = 0;

// game variables
let currentGameMode: GameMode = GameMode.SETUP;
let nodes: Node[] = [];
let nodeCount = DEFAULT_NODE_COUNT;
let rotationalSpeed = DEFAULT_ROTATION_SPEED;
let gameTimer: number;
let startTime: number = 0;
let elapsedTime: number = 0;
let currActiveNodeId = 1;
let bestTime = 0;

// ============================ HELPERS ============================
function resetGame() {
    headerText = "click target 1 to begin";
    currActiveNodeId = 1;
    elapsedTime = 0;
    generateNodes();
    currentGameMode = GameMode.SETUP;
}

function generateNodes(newSet = true) {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = (CANVAS_HEIGHT + TITLE_HEADER_HEIGHT) / 2;
    const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT - TITLE_HEADER_HEIGHT) / 3;
    const angleStep = 360 / nodeCount;

    if (newSet) {
        // genereate brand new set of nodes that have randomized positions
        const centerX = CANVAS_WIDTH / 2;
        const centerY = (CANVAS_HEIGHT + TITLE_HEADER_HEIGHT) / 2;
        const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT - TITLE_HEADER_HEIGHT) / 3;
        const angleStep = 360 / nodeCount;
        const angles = Array.from({ length: nodeCount }, (_, i) => i * angleStep).sort(() => Math.random() - 0.5);

        nodes = angles.map((angle, index) => {
            const radian = angle * Math.PI / 180;
            const targetRadius = MIN_NODE_RADIUS + Math.random() * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
            const targetX = centerX + radius * Math.cos(radian);
            const targetY = centerY + radius * Math.sin(radian);

            const nodeFillColour = index === 0 ? ACTIVE_TARGET_NODE_COLOUR : INACTIVE_TARGET_NODE_COLOUR;
            const nodeActive = index === 0 ? true : false;
            // randomly assign a trig function as radius dialation function
            const nodeDialationTrigFunction = Math.random() > 0.5 ? DialationFunction.SINE : DialationFunction.COSINE;

            return {
                id: index + 1,
                x: targetX,
                y: targetY,
                angle: angle,
                radius: targetRadius,
                activeTarget: nodeActive,
                fillStyle: nodeFillColour,
                dialationTrigFunction: nodeDialationTrigFunction
            };
        });
    } else {
        // node list exists, just recalculate positions
        nodes.forEach((node, i) => {
            const angle = i * angleStep * Math.PI / 180;
            const targetX = centerX + radius * Math.cos(angle);
            const targetY = centerY + radius * Math.sin(angle);
            node.x = targetX;
            node.y = targetY;
        });
    }
}

function processNodeClick(nodeClickedIndex: number) {
    // stop timer right away if the game is over
    if (nodeClickedIndex + 1 >= nodes.length) {
        currentGameMode = GameMode.END;
        clearInterval(gameTimer);
    }
    
    if (nodeClickedIndex !== -1 && nodes[nodeClickedIndex].activeTarget) {
        const randomHue = Math.floor(Math.random() * 360);
        nodes[nodeClickedIndex].fillStyle = `hsl(${randomHue}, 100%, 50%)`;

        // Deactivate the current target
        nodes[nodeClickedIndex].activeTarget = false;

        // Activate the next target
        if (nodeClickedIndex + 1 < nodes.length) {
            currActiveNodeId++;
            const nextNode = nodes.find(node => node.id === currActiveNodeId);
            if (nextNode) {
                nextNode.activeTarget = true;
                nextNode.fillStyle = ACTIVE_TARGET_NODE_COLOUR;
            }
        } else {
            // End the game if the last target is clicked
            if (elapsedTime < bestTime || bestTime === 0) {
                bestTime = elapsedTime;
                headerText = `${Math.floor(elapsedTime)}.${(elapsedTime % 1).toFixed(1).substring(2)} (new best!)`;
            } else {
                headerText = `${Math.floor(elapsedTime)}.${(elapsedTime % 1).toFixed(1).substring(2)} (best: ${Math.floor(bestTime)}.${(bestTime % 1).toFixed(1).substring(2)})`;
            }
        }
    }
}


// ============================ DRAWING ============================
function drawCanvasBackground(gc: CanvasRenderingContext2D) {
    gc.fillStyle = canvasBackgroundColour;
    gc.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawCanvasHeader(gc: CanvasRenderingContext2D) {
     // Horizontal line
     gc.strokeStyle = "white";
     gc.lineWidth = 2;
     gc.beginPath();
     gc.moveTo(0, TITLE_HEADER_HEIGHT);
     gc.lineTo(CANVAS_WIDTH, TITLE_HEADER_HEIGHT);
     gc.stroke();
   
     // Text message
     gc.fillStyle = "white";
     gc.font = "24px sans-serif";
     const textX = CANVAS_WIDTH / 2;
     const textY = TITLE_HEADER_HEIGHT / 2;
     gc.textAlign = "center";
     gc.textBaseline = "middle";
     gc.fillText(headerText, textX, textY);
}

function drawSetupCanvas(gc: CanvasRenderingContext2D) {
    drawCanvasBackground(gc);
    drawCanvasHeader(gc);  
}

function drawSetupNodes(gc: CanvasRenderingContext2D) {
    nodes.forEach((node, index) => {
        const angle = (node.angle + elapsedTime * rotationalSpeed) % 360;
        const radian = angle * Math.PI / 180;
        const centerX = CANVAS_WIDTH / 2;
        const centerY = (CANVAS_HEIGHT + TITLE_HEADER_HEIGHT) / 2;
        const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT - TITLE_HEADER_HEIGHT) / 3;
        node.x = centerX + radius * Math.cos(radian);
        node.y = centerY + radius * Math.sin(radian);

        let dilationRadius = node.radius;
        if (APPLY_DILATION) {
            // get variables for trigonometric dilation
            let amplitude = (MAX_NODE_RADIUS - MIN_NODE_RADIUS) / 2;
            let vertShift = (MIN_NODE_RADIUS + MAX_NODE_RADIUS) / 2;
            let horizontalFactor = 2 * Math.PI / DEFAULT_DIALATION_DURATION;
            let phase_shift = 0;

            if (node.dialationTrigFunction === DialationFunction.SINE) {
                phase_shift = (Math.asin((node.radius - vertShift)/amplitude) / horizontalFactor) * (-1);
            } else {
                phase_shift = (Math.acos((node.radius - vertShift)/amplitude) / horizontalFactor) * (-1);
            }

            if (currentGameMode !== GameMode.SETUP) {
                // Calculate dilation
                if (node.dialationTrigFunction === DialationFunction.SINE) {
                    dilationRadius = amplitude * Math.sin(horizontalFactor * (elapsedTime - phase_shift)) + vertShift;
                } else {
                    dilationRadius = amplitude * Math.cos(horizontalFactor * (elapsedTime - phase_shift)) + vertShift;
                }
                dilationRadius = Math.max(MIN_NODE_RADIUS, Math.min(MAX_NODE_RADIUS, dilationRadius));
            }
        }

        gc.fillStyle = node.fillStyle;
        gc.beginPath();
        gc.arc(node.x, node.y, dilationRadius, 0, 2 * Math.PI);
        gc.fill();

        if (node.id <= currActiveNodeId) {
            gc.fillStyle = "black";
            gc.font = "20px sans-serif";
            gc.textAlign = "center";
            gc.textBaseline = "middle";
            gc.fillText(node.id.toString(), node.x, node.y);
        }

        if (index === hoveredNodeIndex) {
            gc.strokeStyle = "lightblue";
            gc.lineWidth = 3;
            gc.stroke();
        }
    });
}

function drawClickAnimation(gc: CanvasRenderingContext2D) {
    if (clickAnimationStartTime !== null) {
        const elapsed = (Date.now() - clickAnimationStartTime) / 1000;
        const radius = CLICK_ANIMATION_STARTING_RADIUS + (CLICK_ANIMATION_ENDING_RADIUS - CLICK_ANIMATION_STARTING_RADIUS) * Math.min(elapsed / CLICK_ANIMATION_DURATION, 1);

        gc.strokeStyle = "yellow";
        gc.lineWidth = 3;
        gc.beginPath();
        gc.arc(clickAnimationCoordX, clickAnimationCoordY, radius, 0, 2 * Math.PI);
        gc.stroke();

        if (elapsed >= CLICK_ANIMATION_DURATION) {
            clickAnimationStartTime = null;
        }
    }
}

setSKDrawCallback((gc) => {
    drawSetupCanvas(gc);
    if (nodes.length === 0) {
        generateNodes();
    }
    drawSetupNodes(gc);
    drawClickAnimation(gc);
});


// ============================ EVENT HANDLING ============================
function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// create longclick translator
const longClickTranslator = {
    state: "IDLE",
    startX: 0,
    startY: 0,
    startTime: 0,
    movementThreshold: 10,
    holdDuration: 1000, // 1 second

    update(fe: FundamentalEvent): SKMouseEvent | undefined {
        switch (this.state) {
            case "IDLE":
                if (fe.type == "mousedown") {
                    this.state = "DOWN";
                    this.startX = fe.x || 0;
                    this.startY = fe.y || 0;
                    this.startTime = fe.timeStamp;
                }
                break;

            case "DOWN":
                if (fe.type == "mouseup") {
                    const elapsedTime = fe.timeStamp - this.startTime;
                    if (elapsedTime >= this.holdDuration) {
                        this.state = "IDLE";
                        return {
                            type: "longclick",
                            timeStamp: fe.timeStamp,
                            x: fe.x,
                            y: fe.y,
                        } as SKMouseEvent;
                    } else {
                        this.state = "IDLE";
                    }
                } else if (
                    fe.type == "mousemove" &&
                    fe.x &&
                    fe.y &&
                    distance(fe.x, fe.y, this.startX, this.startY) >
                        this.movementThreshold
                ) {
                    this.state = "IDLE";
                }
                break;
        }
        return;
    },
};
addSKEventTranslator(longClickTranslator);

function handleEvent(e: SKEvent) {
    switch (e.type) {
        case "resize":
            CANVAS_WIDTH = (e as SKResizeEvent).width;
            CANVAS_HEIGHT = (e as SKResizeEvent).height;
            generateNodes(false);
            break;
        case "keydown":
            const event = e as KeyboardEvent;
            switch (event.key) {
                case " ":
                    if (currentGameMode === GameMode.SETUP) {
                        // randomize order of targets within circular pattern
                        generateNodes();
                    } else if (currentGameMode === GameMode.END) {
                        // reset to setup
                        resetGame();
                    }
                    break;
                case "c":
                    if (currentGameMode === GameMode.PLAY) {
                        // cheat mode, auto click next target
                        let targetNodeIndex = nodes.findIndex(node => node.activeTarget);
                        processNodeClick(targetNodeIndex);
                    }
                    break;
                case "[":
                    // decrease node count
                    if (nodeCount > MIN_NODE_COUNT && currentGameMode === GameMode.SETUP) {
                        nodeCount -= 1;
                        generateNodes();
                    }
                break;
                case "]":
                    // increase node count
                    if (nodeCount < MAX_NODE_COUNT && currentGameMode === GameMode.SETUP) {
                        nodeCount += 1;
                        generateNodes();
                    }
                    break;
                case "{":
                    // decrease rotation speed
                    if (rotationalSpeed > MIN_ROTATION_SPEED && currentGameMode === GameMode.SETUP) {
                        rotationalSpeed -= 1;
                    }
                    break;
                case "}":
                    // increase rotation speed
                    if (rotationalSpeed < MAX_ROTATION_SPEED && currentGameMode === GameMode.SETUP) {
                        rotationalSpeed += 1;
                    }
                    break;
            }
            break;
        case "click":
            const clickEvent = e as SKMouseEvent;
            let nodeClickedIndex = nodes.findIndex(node => 
                clickEvent.x >= node.x - node.radius &&
                clickEvent.x <= node.x + node.radius &&
                clickEvent.y >= node.y - node.radius &&
                clickEvent.y <= node.y + node.radius
            );
            
            // node click animation
            if (currentGameMode !== GameMode.END && nodeClickedIndex !== -1 && nodes[nodeClickedIndex].activeTarget) {
                clickAnimationStartTime = Date.now();
                clickAnimationCoordX = nodes[nodeClickedIndex].x;
                clickAnimationCoordY = nodes[nodeClickedIndex].y;
            }

            if (currentGameMode === GameMode.SETUP) {
                if (nodeClickedIndex === 0) {
                    // start the game
                    currentGameMode = GameMode.PLAY;
                    startTime = Date.now();
                    gameTimer = setInterval(() => {
                        elapsedTime = (Date.now() - startTime) / 1000;
                        headerText = `${Math.floor(elapsedTime)}.${(elapsedTime % 1).toFixed(1).substring(2)}`;
                    }, 100);
                } 
            }

            if (currentGameMode === GameMode.PLAY) {
                processNodeClick(nodeClickedIndex);
            }
            break;
        case "mousemove":
            const mouseEvent = e as SKMouseEvent;
            hoveredNodeIndex = nodes.findIndex(node => 
                mouseEvent.x >= node.x - node.radius &&
                mouseEvent.x <= node.x + node.radius &&
                mouseEvent.y >= node.y - node.radius &&
                mouseEvent.y <= node.y + node.radius
            );
            break;
        case "mousedown":
            const mouseDownEvent = e as SKMouseEvent;
            let nodeClickedInd = nodes.findIndex(node => 
                mouseDownEvent.x >= node.x - node.radius &&
                mouseDownEvent.x <= node.x + node.radius &&
                mouseDownEvent.y >= node.y - node.radius &&
                mouseDownEvent.y <= node.y + node.radius
            );
            if (nodeClickedInd == -1 || !nodes[nodeClickedInd].activeTarget) {
                // clicked wrong node, set darkRed background
                canvasBackgroundColour = INCORRECT_TARGET_CLICK_CANVAS_BACKGROUND_COLOUR;
            }
            break;
        case "mouseup":
            canvasBackgroundColour = DEFAULT_CANVAS_BACKGROUND_COLOUR;
            break;
        case "longclick":
            console.log("longclick event triggered");
            if (currentGameMode === GameMode.PLAY) {
                currentGameMode = GameMode.END;
                clearInterval(gameTimer);
                resetGame();
            }
            break;

    }
}

setSKEventListener(handleEvent);
