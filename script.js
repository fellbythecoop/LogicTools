document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const xmlContent = document.getElementById('xmlContent');
    const showProgramsButton = document.getElementById('showProgramsButton');
    const programHierarchy = document.getElementById('programHierarchy');
    const ladderInput = document.getElementById('ladderInput');
    const parseLadderButton = document.getElementById('parseLadderButton');
    const ladderVisualization = document.getElementById('ladderVisualization');
    const rungContainer = ladderVisualization.querySelector('.rung-container');
    const routineSelect = document.getElementById('routineSelect');
    const rungSelect = document.getElementById('rungSelect');
    const ladderError = document.getElementById('ladderError');

    let currentFile = null;
    let xmlDoc = null;
    let routinesData = {};

    function createCollapsibleNode(tag, attributes, content, hasChildren) {
        const node = document.createElement('div');
        node.className = `xml-node${hasChildren ? ' has-children' : ''}`;
        
        const collapseIcon = document.createElement('span');
        collapseIcon.className = 'collapse-icon';
        node.appendChild(collapseIcon);

        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.innerHTML = `&lt;${tag}${attributes ? ' ' + attributes : ''}&gt;`;
        node.appendChild(tagSpan);

        let contentDiv;
        if (content) {
            contentDiv = document.createElement('div');
            contentDiv.className = 'xml-node-content';
            contentDiv.innerHTML = content;
            node.appendChild(contentDiv);
        }

        if (hasChildren) {
            const closingTag = document.createElement('span');
            closingTag.className = 'tag';
            closingTag.innerHTML = `&lt;/${tag}&gt;`;
            
            if (contentDiv) {
                contentDiv.appendChild(closingTag);
            } else {
                node.appendChild(closingTag);
            }

            node.addEventListener('click', (e) => {
                if (e.target === collapseIcon || e.target === tagSpan) {
                    node.classList.toggle('collapsed');
                    collapseIcon.classList.toggle('expanded');
                }
            });
        }

        return node;
    }

    function formatXML(xml) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        xmlDoc = doc; // Store the parsed document for program hierarchy
        
        function processNode(node, level = 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    return `<span class="value">${text}</span>`;
                }
                return '';
            }

            if (node.nodeType === Node.COMMENT_NODE) {
                return `<span class="comment">&lt;!--${node.textContent}--&gt;</span>`;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName;
                const attributes = Array.from(node.attributes)
                    .map(attr => `<span class="attribute"> ${attr.name}</span>=<span class="value">"${attr.value}"</span>`)
                    .join('');
                
                const hasChildren = node.children.length > 0;
                let content = '';

                if (hasChildren) {
                    content = Array.from(node.childNodes)
                        .map(child => processNode(child, level + 1))
                        .join('');
                } else if (node.textContent.trim()) {
                    content = `<span class="value">${node.textContent.trim()}</span>`;
                }

                return createCollapsibleNode(tag, attributes, content, hasChildren).outerHTML;
            }

            return '';
        }

        const formattedContent = processNode(doc.documentElement);
        return formattedContent;
    }

    function displayProgramHierarchy() {
        if (!xmlDoc) {
            showError('Please load an L5X file first.');
            return;
        }

        programHierarchy.innerHTML = '';
        const tasks = xmlDoc.getElementsByTagName('Task');

        Array.from(tasks).forEach(task => {
            const taskName = task.getAttribute('Name');
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';

            const taskHeader = document.createElement('div');
            taskHeader.className = 'task-header';
            taskHeader.textContent = `Task: ${taskName}`;
            taskItem.appendChild(taskHeader);

            const programList = document.createElement('div');
            programList.className = 'program-list';

            const scheduledPrograms = task.getElementsByTagName('ScheduledProgram');
            Array.from(scheduledPrograms).forEach(program => {
                const programName = program.getAttribute('Name');
                const programItem = document.createElement('div');
                programItem.className = 'program-item';
                programItem.textContent = `Program: ${programName}`;

                // Find routines for this program
                const routines = xmlDoc.querySelector(`Program[Name="${programName}"] Routines Routine`);
                if (routines) {
                    const routineList = document.createElement('div');
                    routineList.className = 'routine-list';
                    
                    Array.from(routines.parentElement.children).forEach(routine => {
                        const routineName = routine.getAttribute('Name');
                        const routineItem = document.createElement('div');
                        routineItem.className = 'routine-item';
                        routineItem.textContent = `Routine: ${routineName}`;
                        routineList.appendChild(routineItem);
                    });

                    programItem.appendChild(routineList);
                }

                programList.appendChild(programItem);
            });

            taskItem.appendChild(programList);
            programHierarchy.appendChild(taskItem);
        });
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        programHierarchy.innerHTML = '';
        programHierarchy.appendChild(errorDiv);
    }

    function showLadderError(message) {
        ladderError.textContent = message;
        ladderError.style.display = 'block';
    }

    function hideLadderError() {
        ladderError.style.display = 'none';
    }

    // Populate routine and rung dropdowns from XML
    function populateRoutineAndRungDropdowns() {
        routinesData = {};
        routineSelect.innerHTML = '';
        rungSelect.innerHTML = '';
        if (!xmlDoc) return;

        // First, get all programs and their routines
        const programs = xmlDoc.querySelectorAll('Program');
        programs.forEach(program => {
            const programName = program.getAttribute('Name');
            const routines = program.querySelectorAll('Routines > Routine');
            
            routines.forEach(routine => {
                const routineName = routine.getAttribute('Name');
                const rungs = Array.from(routine.querySelectorAll('RLLContent > Rung'));
                
                // Store data with program name prefix
                const fullRoutineName = `${programName}.${routineName}`;
                routinesData[fullRoutineName] = rungs.map(rung => ({
                    number: rung.getAttribute('Number') || rung.getAttribute('number'), // Try both Number and number attributes
                    text: (rung.querySelector('Text') || {}).textContent || ''
                }));

                const option = document.createElement('option');
                option.value = fullRoutineName;
                option.textContent = fullRoutineName;
                routineSelect.appendChild(option);
            });
        });

        if (Object.keys(routinesData).length > 0) {
            routineSelect.value = Object.keys(routinesData)[0];
            populateRungDropdown();
        }
    }

    function populateRungDropdown() {
        rungSelect.innerHTML = '';
        const selectedRoutine = routineSelect.value;
        if (!selectedRoutine || !routinesData[selectedRoutine]) return;

        routinesData[selectedRoutine].forEach((rung, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            // Use the rung number from the data, fallback to index + 1 if not available
            const rungNumber = rung.number !== null && rung.number !== undefined ? rung.number : (idx + 1);
            option.textContent = `Rung ${rungNumber}`;
            rungSelect.appendChild(option);
        });

        if (routinesData[selectedRoutine].length > 0) {
            rungSelect.value = 0;
        }
    }

    function loadRungText() {
        const selectedRoutine = routineSelect.value;
        const selectedRungIdx = parseInt(rungSelect.value, 10);
        if (!selectedRoutine || isNaN(selectedRungIdx)) return;
        const rung = routinesData[selectedRoutine][selectedRungIdx];
        if (rung) {
            ladderInput.value = rung.text.trim();
            // Automatically trigger the parse ladder logic button
            parseLadderButton.click();
        }
    }

    routineSelect.addEventListener('change', () => {
        populateRungDropdown();
        // Always load the first rung's text after changing routine
        loadRungText();
    });
    rungSelect.addEventListener('change', () => {
        loadRungText();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.l5x')) {
                currentFile = file;
                fileName.textContent = `Selected file: ${file.name}`;
                programHierarchy.innerHTML = '';
                
                try {
                    const text = await file.text();
                    xmlContent.innerHTML = formatXML(text);
                    // Add click handlers for all collapsible nodes
                    xmlContent.querySelectorAll('.xml-node.has-children').forEach(node => {
                        const collapseIcon = node.querySelector('.collapse-icon');
                        const tagSpan = node.querySelector('.tag');
                        node.addEventListener('click', (e) => {
                            if (e.target === collapseIcon || e.target === tagSpan) {
                                node.classList.toggle('collapsed');
                                collapseIcon.classList.toggle('expanded');
                            }
                        });
                    });
                    // Populate routine/rung dropdowns
                    populateRoutineAndRungDropdowns();
                } catch (error) {
                    console.error('Error reading file:', error);
                    showError('Error reading file: ' + error.message);
                }
            } else {
                showError('Please select a valid L5X file.');
                fileInput.value = '';
                fileName.textContent = '';
                currentFile = null;
                xmlContent.innerHTML = '';
                programHierarchy.innerHTML = '';
            }
        }
    });

    showProgramsButton.addEventListener('click', displayProgramHierarchy);

    // --- Ladder Logic Parsing with Branch Support ---
    function parseLadderLogic(input) {
        // Remove any extra whitespace and split into rungs
        const rungs = input.split(';')
            .map(rung => rung.trim())
            .filter(rung => rung.length > 0);

        if (rungs.length === 0) {
            throw new Error('No valid rungs found in input');
        }

        return rungs.map(rung => {
            try {
                // Handle multiple bracket groups format: [group1][group2]OTE(output) or [group1][group2][outputs]
                if (rung.includes('][')) {
                    console.log('Processing multiple bracket format for rung:', rung); // Debug log
                    const bracketGroups = rung.match(/\[([^\]]+)\]/g);
                    console.log('Found bracket groups:', bracketGroups); // Debug log
                    
                    if (!bracketGroups || bracketGroups.length < 2) {
                        throw new Error(`Invalid multiple bracket format: ${rung}`);
                    }
                    
                    // Check if there's an instruction after all brackets (format: [group1][group2]OTE(output))
                    const allBracketsPattern = /(\[[^\]]+\])+/;
                    const afterBracketsMatch = rung.match(allBracketsPattern);
                    
                    if (afterBracketsMatch) {
                        const afterBrackets = rung.slice(afterBracketsMatch[0].length).trim();
                        console.log('After brackets:', afterBrackets); // Debug log
                        
                        if (afterBrackets && afterBrackets.match(/^\w+\(/)) {
                            // Format: [group1][group2]OTE(output) - output is outside brackets
                            const outputInstruction = parseInstruction(afterBrackets);
                            
                            // All bracket groups are input branches
                            const allBranches = bracketGroups.map(group => {
                                const content = group.slice(1, -1).trim(); // Remove [ and ]
                                const instructions = content.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
                                return instructions.map(instr => parseInstruction(instr));
                            });
                            
                            if (allBranches.length === 1) {
                                // Single branch - treat as series
                                return {
                                    inputs: allBranches[0],
                                    output: outputInstruction
                                };
                            } else {
                                // Multiple branches
                                return {
                                    inputs: {
                                        mainBranch: allBranches[0],
                                        sideBranches: allBranches.slice(1)
                                    },
                                    output: outputInstruction
                                };
                            }
                        }
                    }
                    
                    // Fallback: treat last bracket group as outputs (format: [group1][group2][outputs])
                    const outputGroup = bracketGroups[bracketGroups.length - 1];
                    const outputContent = outputGroup.slice(1, -1).trim(); // Remove [ and ]
                    console.log('Output group:', outputGroup, 'Content:', outputContent); // Debug log
                    
                    // Parse all output instructions
                    const outputInstructions = outputContent.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
                    console.log('Output instructions:', outputInstructions); // Debug log
                    const parsedOutputs = outputInstructions.map(instr => parseInstruction(instr));
                    console.log('Parsed outputs:', parsedOutputs); // Debug log
                    
                    if (parsedOutputs.length === 0) {
                        throw new Error(`No output instructions found in output group: ${outputGroup}`);
                    }
                    
                    // Parse input bracket groups as branches
                    const inputGroups = bracketGroups.slice(0, -1);
                    console.log('Input groups:', inputGroups); // Debug log
                    
                    if (inputGroups.length === 0) {
                        throw new Error(`No input groups found`);
                    }
                    
                    // Parse each input group as a branch
                    const allInputBranches = inputGroups.map(group => {
                        const content = group.slice(1, -1).trim(); // Remove [ and ]
                        const instructions = content.split(/,(?![^()]*\))/).map(s => s.trim()).filter(Boolean);
                        return instructions.map(instr => parseInstruction(instr));
                    });
                    
                    // Structure outputs similar to inputs
                    let outputStructure;
                    if (parsedOutputs.length === 1) {
                        // Single output - simple structure
                        outputStructure = parsedOutputs[0];
                    } else {
                        // Multiple outputs - treat as branches
                        outputStructure = {
                            mainBranch: [parsedOutputs[0]], // First output on main branch
                            sideBranches: parsedOutputs.slice(1).map(output => [output]) // Each additional output on its own side branch
                        };
                    }
                    
                    if (allInputBranches.length === 1) {
                        // Single input branch - treat as series
                        return {
                            inputs: allInputBranches[0],
                            output: outputStructure
                        };
                    } else {
                        // Multiple input branches
                        return {
                            inputs: {
                                mainBranch: allInputBranches[0],
                                sideBranches: allInputBranches.slice(1)
                            },
                            output: outputStructure
                        };
                    }
                }
                
                // Find all instructions in the rung
                const allInstructions = rung.match(/(\w+\([^)]+\))/g) || [];
                
                if (allInstructions.length === 0) {
                    throw new Error(`No valid instructions found in: ${rung}`);
                }
                
                console.log('All instructions found:', allInstructions); // Debug log
                
                // Try to identify the last instruction as output
                let output = null;
                let inputInstructions = allInstructions.slice(); // Copy all instructions initially
                
                if (allInstructions.length > 0) {
                    const lastInstruction = allInstructions[allInstructions.length - 1];
                    const parsedLastInstruction = parseInstruction(lastInstruction);
                    
                    console.log('Last instruction:', lastInstruction, 'Type:', parsedLastInstruction.type); // Debug log
                    
                    // Check if it's a typical output instruction
                    if (parsedLastInstruction.type.match(/^(OTE|ONS|OSR|OSF|OTL|OTU)$/i)) {
                        output = parsedLastInstruction;
                        inputInstructions = allInstructions.slice(0, -1); // Remove the output from inputs
                        console.log('Found output instruction:', output); // Debug log
                    } else {
                        // For unknown instructions at the end, treat them as outputs too
                        // This handles cases like PAI, etc.
                        output = parsedLastInstruction;
                        inputInstructions = allInstructions.slice(0, -1); // Remove the output from inputs
                        console.log('Treating unknown instruction as output:', output); // Debug log
                    }
                }
                
                // Parse input instructions
                let parsedInputs = [];
                if (inputInstructions.length > 0) {
                    // Check if input starts with brackets for branching
                    const inputPortion = inputInstructions.join('');
                    
                    if (inputPortion.startsWith('[') && inputPortion.includes(']')) {
                        // Handle branched inputs
                        const main = inputPortion;
                        const closeIdx = main.indexOf(']');
                        if (closeIdx === -1) {
                            throw new Error('Unmatched [ in rung');
                        }
                        const branchContent = main.slice(1, closeIdx).trim();
                        const afterBranches = main.slice(closeIdx + 1).trim();
                        
                        // Split on commas not inside parentheses
                        const branchStrings = branchContent.split(/,(?![^()]*\))/).map(b => b.trim()).filter(Boolean);
                        
                        if (branchStrings.length === 0) {
                            throw new Error('Empty branch block found');
                        }
                        
                        // First branch stays on main rung
                        const mainBranchInstructions = branchStrings[0].match(/(\w+\([^)]+\))/g) || [];
                        const mainBranch = mainBranchInstructions.map(instr => parseInstruction(instr));
                        
                        // Additional branches drop down
                        const sideBranches = branchStrings.slice(1).map(branchStr => {
                            const instructions = branchStr.match(/(\w+\([^)]+\))/g) || [];
                            return instructions.map(instr => parseInstruction(instr));
                        });
                        
                        parsedInputs = {
                            mainBranch: mainBranch,
                            sideBranches: sideBranches
                        };
                        
                        // Parse any series instructions after the branches
                        if (afterBranches) {
                            const seriesInstructions = afterBranches.match(/(\w+\([^)]+\))/g) || [];
                            parsedInputs.seriesAfterBranches = seriesInstructions.map(instr => parseInstruction(instr));
                        }
                    } else {
                        // Simple series of instructions
                        parsedInputs = inputInstructions.map(instr => parseInstruction(instr));
                    }
                }
                
                console.log('Final parsed inputs:', parsedInputs); // Debug log
                console.log('Final parsed output:', output); // Debug log
                
                // Ensure we have valid inputs or outputs
                if ((!parsedInputs || 
                    (Array.isArray(parsedInputs) && parsedInputs.length === 0) || 
                    (!Array.isArray(parsedInputs) && typeof parsedInputs === 'object' && !parsedInputs.mainBranch && !parsedInputs.sideBranches)) && !output) {
                    throw new Error(`No valid instructions found in: ${rung}`);
                }

                return {
                    inputs: parsedInputs.length > 0 ? parsedInputs : null,
                    output: output
                };
            } catch (error) {
                console.error(`Error parsing rung "${rung}":`, error);
                throw error;
            }
        }).filter(rung => rung !== null);
    }

    // Parse a single instruction (XIC, XIO, OTE, etc.)
    function parseInstruction(instruction) {
        if (!instruction) {
            throw new Error('Empty instruction provided');
        }
        const match = instruction.match(/(\w+)\((.*?)\)/);
        if (!match) {
            throw new Error(`Invalid instruction format: ${instruction}`);
        }
        return {
            type: match[1],
            tag: match[2]
        };
    }

    // --- Ladder Logic Visualization with Branch Support ---
    function visualizeLadderLogic(parsedRungs) {
        rungContainer.innerHTML = '';
        
        parsedRungs.forEach(rung => {
            console.log('Visualizing rung:', rung);
            
            const rungElement = document.createElement('div');
            rungElement.className = 'rung';
            
            // Calculate dynamic SVG height based on number of side branches (both input and output)
            const BASE_HEIGHT = 180;
            const BRANCH_HEIGHT = 80; // Height added per side branch
            
            // Count input side branches - add null checks
            const numInputSideBranches = (rung.inputs && typeof rung.inputs === 'object' && rung.inputs.sideBranches) ? rung.inputs.sideBranches.length : 0;
            
            // Count output side branches - add null checks
            const numOutputSideBranches = (rung.output && typeof rung.output === 'object' && rung.output.sideBranches) ? rung.output.sideBranches.length : 0;
            
            const maxSideBranches = Math.max(numInputSideBranches, numOutputSideBranches);
            const SVG_HEIGHT = BASE_HEIGHT + (maxSideBranches * BRANCH_HEIGHT);
            
            // SVG dimensions and constants
            const SVG_WIDTH = 800;
            const INSTRUCTION_WIDTH = 100;
            const INSTRUCTION_HEIGHT = 40;
            const HORIZONTAL_SPACING = 30; // Only used for gaps between different sections
            const VERTICAL_BRANCH_SPACING = 80; // Spacing between side branches
            const POWER_RAIL_OFFSET = 20;
            const BRANCH_VERTICAL_OFFSET = 40; // Small gap after power rail for vertical branch line
            const BRANCH_HORIZONTAL_GAP = 30; // Gap between vertical line and first instruction
            const MAIN_RUNG_Y = SVG_HEIGHT / 2;
            
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'ladder-svg');
            svg.setAttribute('width', SVG_WIDTH);
            svg.setAttribute('height', SVG_HEIGHT);
            svg.style.overflow = 'visible';
            
            // Power rails
            svg.appendChild(createSVGLine(POWER_RAIL_OFFSET, 0, POWER_RAIL_OFFSET, SVG_HEIGHT, '#2c3e50', 2));
            svg.appendChild(createSVGLine(SVG_WIDTH - POWER_RAIL_OFFSET, 0, SVG_WIDTH - POWER_RAIL_OFFSET, SVG_HEIGHT, '#2c3e50', 2));
            
            let rungStartX = POWER_RAIL_OFFSET;
            let rungEndX = SVG_WIDTH - POWER_RAIL_OFFSET;
            
            // Check for branched input structure - add null checks
            if (rung.inputs && typeof rung.inputs === 'object' && (rung.inputs.mainBranch || rung.inputs.sideBranches)) {
                const mainBranch = rung.inputs.mainBranch || [];
                const sideBranches = rung.inputs.sideBranches || [];
                const seriesAfterBranches = rung.inputs.seriesAfterBranches || [];
                
                // Branch starts immediately after power rail with small offset
                const branchVerticalX = rungStartX + BRANCH_VERTICAL_OFFSET;
                
                // Instructions start after the vertical line plus gap
                const branchInstructionStartX = branchVerticalX + BRANCH_HORIZONTAL_GAP;
                
                // Calculate the span of the branch section
                let maxBranchLength = mainBranch.length;
                sideBranches.forEach(branch => {
                    maxBranchLength = Math.max(maxBranchLength, branch.length);
                });
                
                const branchInstructionEndX = branchInstructionStartX + (maxBranchLength * INSTRUCTION_WIDTH);
                
                // Draw main line segments around the main branch instructions
                // Left segment: from power rail to branch start
                svg.appendChild(createSVGLine(rungStartX, MAIN_RUNG_Y, branchVerticalX, MAIN_RUNG_Y, '#2c3e50', 2));
                
                // Middle left segment: from branch vertical to first main instruction
                svg.appendChild(createSVGLine(branchVerticalX, MAIN_RUNG_Y, branchInstructionStartX, MAIN_RUNG_Y, '#2c3e50', 2));
                
                // Draw main branch instructions on the main rung (no spacing between them)
                let mainBranchX = branchInstructionStartX;
                mainBranch.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, mainBranchX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    mainBranchX += INSTRUCTION_WIDTH;
                });
                
                // Middle right segment: from last main instruction to branch end
                const mainBranchEndX = branchInstructionStartX + (mainBranch.length * INSTRUCTION_WIDTH);
                svg.appendChild(createSVGLine(mainBranchEndX, MAIN_RUNG_Y, branchInstructionEndX + BRANCH_HORIZONTAL_GAP, MAIN_RUNG_Y, '#2c3e50', 2));
                
                // Draw side branches
                if (sideBranches.length > 0) {
                    // Vertical tee line down from main rung at branch start
                    const firstBranchY = MAIN_RUNG_Y + VERTICAL_BRANCH_SPACING;
                    const lastBranchY = MAIN_RUNG_Y + (sideBranches.length * VERTICAL_BRANCH_SPACING);
                    svg.appendChild(createSVGLine(branchVerticalX, MAIN_RUNG_Y, branchVerticalX, lastBranchY, '#2c3e50', 2));
                    
                    // Vertical join line up to main rung at branch end
                    svg.appendChild(createSVGLine(branchInstructionEndX + BRANCH_HORIZONTAL_GAP, MAIN_RUNG_Y, branchInstructionEndX + BRANCH_HORIZONTAL_GAP, lastBranchY, '#2c3e50', 2));
                    
                    sideBranches.forEach((branch, branchIndex) => {
                        const branchY = MAIN_RUNG_Y + ((branchIndex + 1) * VERTICAL_BRANCH_SPACING);
                        
                        // Draw branch instructions first (no spacing between them)
                        let branchInstrX = branchInstructionStartX;
                        branch.forEach((instruction, instrIndex) => {
                            createInstructionSVG(svg, instruction, branchInstrX, branchY - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                            branchInstrX += INSTRUCTION_WIDTH;
                        });
                        
                        // Draw horizontal branch line segments around the instructions
                        // Left segment: from vertical start to first instruction
                        svg.appendChild(createSVGLine(branchVerticalX, branchY, branchInstructionStartX, branchY, '#2c3e50', 2));
                        
                        // Right segment: from last instruction to vertical end
                        const branchEndX = branchInstructionStartX + (branch.length * INSTRUCTION_WIDTH);
                        svg.appendChild(createSVGLine(branchEndX, branchY, branchInstructionEndX + BRANCH_HORIZONTAL_GAP, branchY, '#2c3e50', 2));
                    });
                }
                
                // Update current X to after the branch section
                let currentX = branchInstructionEndX + BRANCH_HORIZONTAL_GAP;
                
                // Draw series instructions after branches (no spacing between them)
                seriesAfterBranches.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, currentX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    currentX += INSTRUCTION_WIDTH;
                });
                
                // Handle output - could be single instruction or branched
                if (rung.output) {
                    if (typeof rung.output === 'object' && (rung.output.mainBranch || rung.output.sideBranches)) {
                        // Branched output
                        const outputMainBranch = rung.output.mainBranch || [];
                        const outputSideBranches = rung.output.sideBranches || [];
                        
                        // Output branch starts before power rail with offset
                        const outputBranchVerticalX = rungEndX - BRANCH_VERTICAL_OFFSET;
                        
                        // Calculate the span of the output branch section
                        let maxOutputBranchLength = outputMainBranch.length;
                        outputSideBranches.forEach(branch => {
                            maxOutputBranchLength = Math.max(maxOutputBranchLength, branch.length);
                        });
                        
                        const outputBranchInstructionEndX = outputBranchVerticalX - BRANCH_HORIZONTAL_GAP;
                        const outputBranchInstructionStartX = outputBranchInstructionEndX - (maxOutputBranchLength * INSTRUCTION_WIDTH);
                        
                        // Connect from current position to output branch start
                        svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, outputBranchInstructionStartX, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Center the main output branch instructions between the vertical lines
                        const availableWidth = outputBranchVerticalX - outputBranchInstructionStartX;
                        const mainBranchTotalWidth = outputMainBranch.length * INSTRUCTION_WIDTH;
                        const mainBranchCenterOffset = (availableWidth - mainBranchTotalWidth) / 2;
                        
                        // Connect from branch start to centered instructions start
                        svg.appendChild(createSVGLine(outputBranchInstructionStartX, MAIN_RUNG_Y, outputBranchInstructionStartX + mainBranchCenterOffset, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Draw main output branch instructions centered on the main rung
                        let outputMainBranchX = outputBranchInstructionStartX + mainBranchCenterOffset;
                        outputMainBranch.forEach((instruction, index) => {
                            createInstructionSVG(svg, instruction, outputMainBranchX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                            outputMainBranchX += INSTRUCTION_WIDTH;
                        });
                        
                        // Connect from output branch end to power rail
                        svg.appendChild(createSVGLine(outputBranchInstructionStartX + mainBranchCenterOffset + mainBranchTotalWidth, MAIN_RUNG_Y, outputBranchVerticalX, MAIN_RUNG_Y, '#2c3e50', 2));
                        svg.appendChild(createSVGLine(outputBranchVerticalX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Draw output side branches
                        if (outputSideBranches.length > 0) {
                            // Vertical tee line down from main rung at output branch start
                            const firstOutputBranchY = MAIN_RUNG_Y + VERTICAL_BRANCH_SPACING;
                            const lastOutputBranchY = MAIN_RUNG_Y + (outputSideBranches.length * VERTICAL_BRANCH_SPACING);
                            svg.appendChild(createSVGLine(outputBranchInstructionStartX, MAIN_RUNG_Y, outputBranchInstructionStartX, lastOutputBranchY, '#2c3e50', 2));
                            
                            // Vertical join line up to main rung at output branch end
                            svg.appendChild(createSVGLine(outputBranchVerticalX, MAIN_RUNG_Y, outputBranchVerticalX, lastOutputBranchY, '#2c3e50', 2));
                            
                            outputSideBranches.forEach((branch, branchIndex) => {
                                const branchY = MAIN_RUNG_Y + ((branchIndex + 1) * VERTICAL_BRANCH_SPACING);
                                
                                // Center the branch instructions between the vertical lines
                                const availableWidth = outputBranchVerticalX - outputBranchInstructionStartX;
                                const totalInstructionWidth = branch.length * INSTRUCTION_WIDTH;
                                const centerOffset = (availableWidth - totalInstructionWidth) / 2;
                                
                                // Draw output branch instructions centered between verticals
                                let outputBranchInstrX = outputBranchInstructionStartX + centerOffset;
                                branch.forEach((instruction, instrIndex) => {
                                    createInstructionSVG(svg, instruction, outputBranchInstrX, branchY - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                                    outputBranchInstrX += INSTRUCTION_WIDTH;
                                });
                                
                                // Draw horizontal output branch line segments
                                // Left segment: from vertical start to first instruction
                                svg.appendChild(createSVGLine(outputBranchInstructionStartX, branchY, outputBranchInstructionStartX + centerOffset, branchY, '#2c3e50', 2));
                                
                                // Right segment: from last instruction to vertical end
                                const outputBranchEndX = outputBranchInstructionStartX + centerOffset + totalInstructionWidth;
                                svg.appendChild(createSVGLine(outputBranchEndX, branchY, outputBranchVerticalX, branchY, '#2c3e50', 2));
                            });
                        }
                    } else {
                        // Single output instruction
                        const oteX = rungEndX - INSTRUCTION_WIDTH;
                        svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, oteX, MAIN_RUNG_Y, '#2c3e50', 2));
                        createInstructionSVG(svg, rung.output, oteX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    }
                } else {
                    // Connect to right power rail if no output
                    svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
                }
                
            } else if (Array.isArray(rung.inputs)) {
                // Series (no branches) - simple series of instructions
                let currentX = rungStartX;
                
                // Connect from power rail to first instruction
                if (rung.inputs.length > 0) {
                    svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, currentX + HORIZONTAL_SPACING, MAIN_RUNG_Y, '#2c3e50', 2));
                    currentX += HORIZONTAL_SPACING;
                }
                
                // Draw instructions with no spacing between them
                rung.inputs.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, currentX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    currentX += INSTRUCTION_WIDTH;
                });
                
                // Handle output - could be single instruction or branched
                if (rung.output) {
                    if (typeof rung.output === 'object' && (rung.output.mainBranch || rung.output.sideBranches)) {
                        // Branched output
                        const outputMainBranch = rung.output.mainBranch || [];
                        const outputSideBranches = rung.output.sideBranches || [];
                        
                        // Output branch starts before power rail with offset
                        const outputBranchVerticalX = rungEndX - BRANCH_VERTICAL_OFFSET;
                        
                        // Calculate the span of the output branch section
                        let maxOutputBranchLength = outputMainBranch.length;
                        outputSideBranches.forEach(branch => {
                            maxOutputBranchLength = Math.max(maxOutputBranchLength, branch.length);
                        });
                        
                        const outputBranchInstructionEndX = outputBranchVerticalX - BRANCH_HORIZONTAL_GAP;
                        const outputBranchInstructionStartX = outputBranchInstructionEndX - (maxOutputBranchLength * INSTRUCTION_WIDTH);
                        
                        // Connect from current position to output branch start
                        svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, outputBranchInstructionStartX, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Center the main output branch instructions between the vertical lines
                        const availableWidth = outputBranchVerticalX - outputBranchInstructionStartX;
                        const mainBranchTotalWidth = outputMainBranch.length * INSTRUCTION_WIDTH;
                        const mainBranchCenterOffset = (availableWidth - mainBranchTotalWidth) / 2;
                        
                        // Connect from branch start to centered instructions start
                        svg.appendChild(createSVGLine(outputBranchInstructionStartX, MAIN_RUNG_Y, outputBranchInstructionStartX + mainBranchCenterOffset, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Draw main output branch instructions centered on the main rung
                        let outputMainBranchX = outputBranchInstructionStartX + mainBranchCenterOffset;
                        outputMainBranch.forEach((instruction, index) => {
                            createInstructionSVG(svg, instruction, outputMainBranchX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                            outputMainBranchX += INSTRUCTION_WIDTH;
                        });
                        
                        // Connect from output branch end to power rail
                        svg.appendChild(createSVGLine(outputBranchInstructionStartX + mainBranchCenterOffset + mainBranchTotalWidth, MAIN_RUNG_Y, outputBranchVerticalX, MAIN_RUNG_Y, '#2c3e50', 2));
                        svg.appendChild(createSVGLine(outputBranchVerticalX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
                        
                        // Draw output side branches
                        if (outputSideBranches.length > 0) {
                            // Vertical tee line down from main rung at output branch start
                            const firstOutputBranchY = MAIN_RUNG_Y + VERTICAL_BRANCH_SPACING;
                            const lastOutputBranchY = MAIN_RUNG_Y + (outputSideBranches.length * VERTICAL_BRANCH_SPACING);
                            svg.appendChild(createSVGLine(outputBranchInstructionStartX, MAIN_RUNG_Y, outputBranchInstructionStartX, lastOutputBranchY, '#2c3e50', 2));
                            
                            // Vertical join line up to main rung at output branch end
                            svg.appendChild(createSVGLine(outputBranchVerticalX, MAIN_RUNG_Y, outputBranchVerticalX, lastOutputBranchY, '#2c3e50', 2));
                            
                            outputSideBranches.forEach((branch, branchIndex) => {
                                const branchY = MAIN_RUNG_Y + ((branchIndex + 1) * VERTICAL_BRANCH_SPACING);
                                
                                // Center the branch instructions between the vertical lines
                                const availableWidth = outputBranchVerticalX - outputBranchInstructionStartX;
                                const totalInstructionWidth = branch.length * INSTRUCTION_WIDTH;
                                const centerOffset = (availableWidth - totalInstructionWidth) / 2;
                                
                                // Draw output branch instructions centered between verticals
                                let outputBranchInstrX = outputBranchInstructionStartX + centerOffset;
                                branch.forEach((instruction, instrIndex) => {
                                    createInstructionSVG(svg, instruction, outputBranchInstrX, branchY - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                                    outputBranchInstrX += INSTRUCTION_WIDTH;
                                });
                                
                                // Draw horizontal output branch line segments
                                // Left segment: from vertical start to first instruction
                                svg.appendChild(createSVGLine(outputBranchInstructionStartX, branchY, outputBranchInstructionStartX + centerOffset, branchY, '#2c3e50', 2));
                                
                                // Right segment: from last instruction to vertical end
                                const outputBranchEndX = outputBranchInstructionStartX + centerOffset + totalInstructionWidth;
                                svg.appendChild(createSVGLine(outputBranchEndX, branchY, outputBranchVerticalX, branchY, '#2c3e50', 2));
                            });
                        }
                    } else {
                        // Single output instruction
                        const oteX = rungEndX - INSTRUCTION_WIDTH;
                        svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, oteX, MAIN_RUNG_Y, '#2c3e50', 2));
                        createInstructionSVG(svg, rung.output, oteX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    }
                } else {
                    // Connect to right power rail if no output
                    svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
                }
            } else {
                // Handle case where there are no inputs but there is an output
                let currentX = rungStartX;
                
                if (rung.output) {
                    // Connect from power rail to output instruction
                    const oteX = rungEndX - INSTRUCTION_WIDTH;
                    svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, oteX, MAIN_RUNG_Y, '#2c3e50', 2));
                    createInstructionSVG(svg, rung.output, oteX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                } else {
                    // Connect power rails directly if no instructions at all
                    svg.appendChild(createSVGLine(currentX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
                }
            }
            
            rungElement.appendChild(svg);
            rungContainer.appendChild(rungElement);
        });
    }

    function createSVGLine(x1, y1, x2, y2, color, width) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        return line;
    }

    function createInstructionSVG(svg, instruction, x, y, w, h) {
        // Create instruction group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('transform', `translate(${x}, ${y})`);
        
        const centerY = h / 2;
        const type = instruction.type.toLowerCase();
        
        if (type === 'xic') {
            // XIC - Normally Open Contact: --| |--
            // Left connection line
            const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftLine.setAttribute('x1', 0);
            leftLine.setAttribute('y1', centerY);
            leftLine.setAttribute('x2', w * 0.3);
            leftLine.setAttribute('y2', centerY);
            leftLine.setAttribute('stroke', '#2c3e50');
            leftLine.setAttribute('stroke-width', '2');
            group.appendChild(leftLine);
            
            // Left contact line
            const leftContact = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftContact.setAttribute('x1', w * 0.3);
            leftContact.setAttribute('y1', centerY - 15);
            leftContact.setAttribute('x2', w * 0.3);
            leftContact.setAttribute('y2', centerY + 15);
            leftContact.setAttribute('stroke', '#2c3e50');
            leftContact.setAttribute('stroke-width', '3');
            group.appendChild(leftContact);
            
            // Right contact line
            const rightContact = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightContact.setAttribute('x1', w * 0.7);
            rightContact.setAttribute('y1', centerY - 15);
            rightContact.setAttribute('x2', w * 0.7);
            rightContact.setAttribute('y2', centerY + 15);
            rightContact.setAttribute('stroke', '#2c3e50');
            rightContact.setAttribute('stroke-width', '3');
            group.appendChild(rightContact);
            
            // Right connection line
            const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightLine.setAttribute('x1', w * 0.7);
            rightLine.setAttribute('y1', centerY);
            rightLine.setAttribute('x2', w);
            rightLine.setAttribute('y2', centerY);
            rightLine.setAttribute('stroke', '#2c3e50');
            rightLine.setAttribute('stroke-width', '2');
            group.appendChild(rightLine);
            
        } else if (type === 'xio') {
            // XIO - Normally Closed Contact: --|\|--
            // Left connection line
            const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftLine.setAttribute('x1', 0);
            leftLine.setAttribute('y1', centerY);
            leftLine.setAttribute('x2', w * 0.3);
            leftLine.setAttribute('y2', centerY);
            leftLine.setAttribute('stroke', '#2c3e50');
            leftLine.setAttribute('stroke-width', '2');
            group.appendChild(leftLine);
            
            // Left contact line
            const leftContact = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftContact.setAttribute('x1', w * 0.3);
            leftContact.setAttribute('y1', centerY - 15);
            leftContact.setAttribute('x2', w * 0.3);
            leftContact.setAttribute('y2', centerY + 15);
            leftContact.setAttribute('stroke', '#2c3e50');
            leftContact.setAttribute('stroke-width', '3');
            group.appendChild(leftContact);
            
            // Right contact line
            const rightContact = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightContact.setAttribute('x1', w * 0.7);
            rightContact.setAttribute('y1', centerY - 15);
            rightContact.setAttribute('x2', w * 0.7);
            rightContact.setAttribute('y2', centerY + 15);
            rightContact.setAttribute('stroke', '#2c3e50');
            rightContact.setAttribute('stroke-width', '3');
            group.appendChild(rightContact);
            
            // Diagonal line for normally closed
            const diagonal = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            diagonal.setAttribute('x1', w * 0.3);
            diagonal.setAttribute('y1', centerY - 15);
            diagonal.setAttribute('x2', w * 0.7);
            diagonal.setAttribute('y2', centerY + 15);
            diagonal.setAttribute('stroke', '#2c3e50');
            diagonal.setAttribute('stroke-width', '3');
            group.appendChild(diagonal);
            
            // Right connection line
            const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightLine.setAttribute('x1', w * 0.7);
            rightLine.setAttribute('y1', centerY);
            rightLine.setAttribute('x2', w);
            rightLine.setAttribute('y2', centerY);
            rightLine.setAttribute('stroke', '#2c3e50');
            rightLine.setAttribute('stroke-width', '2');
            group.appendChild(rightLine);
            
        } else if (type === 'ote') {
            // OTE - Output Coil: --( )--
            // Left connection line
            const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftLine.setAttribute('x1', 0);
            leftLine.setAttribute('y1', centerY);
            leftLine.setAttribute('x2', w * 0.25);
            leftLine.setAttribute('y2', centerY);
            leftLine.setAttribute('stroke', '#2c3e50');
            leftLine.setAttribute('stroke-width', '2');
            group.appendChild(leftLine);
            
            // Coil circle
            const coil = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            coil.setAttribute('cx', w / 2);
            coil.setAttribute('cy', centerY);
            coil.setAttribute('r', 18);
            coil.setAttribute('fill', 'none');
            coil.setAttribute('stroke', '#2c3e50');
            coil.setAttribute('stroke-width', '3');
            group.appendChild(coil);
            
            // Right connection line
            const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightLine.setAttribute('x1', w * 0.75);
            rightLine.setAttribute('y1', centerY);
            rightLine.setAttribute('x2', w);
            rightLine.setAttribute('y2', centerY);
            rightLine.setAttribute('stroke', '#2c3e50');
            rightLine.setAttribute('stroke-width', '2');
            group.appendChild(rightLine);
            
        } else if (['ge', 'gt', 'le', 'lt', 'ne', 'eq'].includes(type)) {
            // Comparison instructions - special layout
            // Left connection line
            const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftLine.setAttribute('x1', 0);
            leftLine.setAttribute('y1', centerY);
            leftLine.setAttribute('x2', w * 0.15);
            leftLine.setAttribute('y2', centerY);
            leftLine.setAttribute('stroke', '#2c3e50');
            leftLine.setAttribute('stroke-width', '2');
            group.appendChild(leftLine);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', w * 0.7);
            rect.setAttribute('height', h * 1.4);
            rect.setAttribute('x', w * 0.15);
            rect.setAttribute('y', centerY - (h * 0.7));
            rect.setAttribute('rx', '4');
            rect.setAttribute('ry', '4');
            rect.setAttribute('fill', getInstructionColor(instruction.type));
            rect.setAttribute('stroke', '#2c3e50');
            rect.setAttribute('stroke-width', '2');
            group.appendChild(rect);
            
            // Right connection line
            const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightLine.setAttribute('x1', w * 0.85);
            rightLine.setAttribute('y1', centerY);
            rightLine.setAttribute('x2', w);
            rightLine.setAttribute('y2', centerY);
            rightLine.setAttribute('stroke', '#2c3e50');
            rightLine.setAttribute('stroke-width', '2');
            group.appendChild(rightLine);
            
            // Parse the tag to get the two values
            const params = instruction.tag.split(',').map(p => p.trim());
            const value1 = params[0] || '';
            const value2 = params[1] || '';
            
            // Get the comparison symbol
            const symbols = {
                'ge': '≥',
                'gt': '>',
                'le': '≤',
                'lt': '<',
                'ne': '≠',
                'eq': '='
            };
            const symbol = symbols[type] || '?';
            
            // Instruction type at the top
            const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeText.setAttribute('x', w/2);
            typeText.setAttribute('y', centerY - h * 0.45);
            typeText.setAttribute('text-anchor', 'middle');
            typeText.setAttribute('dominant-baseline', 'middle');
            typeText.setAttribute('fill', '#2c3e50');
            typeText.setAttribute('font-weight', 'bold');
            typeText.setAttribute('font-size', '16px');
            typeText.textContent = instruction.type.toUpperCase();
            group.appendChild(typeText);
            
            // First value
            const value1Text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            value1Text.setAttribute('x', w/2);
            value1Text.setAttribute('y', centerY - h * 0.2);
            value1Text.setAttribute('text-anchor', 'middle');
            value1Text.setAttribute('dominant-baseline', 'middle');
            value1Text.setAttribute('fill', '#2c3e50');
            value1Text.setAttribute('font-size', '16px');
            value1Text.textContent = value1;
            group.appendChild(value1Text);
            
            // Comparison symbol
            const symbolText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            symbolText.setAttribute('x', w/2);
            symbolText.setAttribute('y', centerY);
            symbolText.setAttribute('text-anchor', 'middle');
            symbolText.setAttribute('dominant-baseline', 'middle');
            symbolText.setAttribute('fill', '#2c3e50');
            symbolText.setAttribute('font-weight', 'bold');
            symbolText.setAttribute('font-size', '16px');
            symbolText.textContent = symbol;
            group.appendChild(symbolText);
            
            // Second value
            const value2Text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            value2Text.setAttribute('x', w/2);
            value2Text.setAttribute('y', centerY + h * 0.2);
            value2Text.setAttribute('text-anchor', 'middle');
            value2Text.setAttribute('dominant-baseline', 'middle');
            value2Text.setAttribute('fill', '#2c3e50');
            value2Text.setAttribute('font-size', '16px');
            value2Text.textContent = value2;
            group.appendChild(value2Text);
            
        } else {
            // Fallback for other instruction types - simple rectangle with connections
            // Left connection line
            const leftLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            leftLine.setAttribute('x1', 0);
            leftLine.setAttribute('y1', centerY);
            leftLine.setAttribute('x2', w * 0.2);
            leftLine.setAttribute('y2', centerY);
            leftLine.setAttribute('stroke', '#2c3e50');
            leftLine.setAttribute('stroke-width', '2');
            group.appendChild(leftLine);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', w * 0.6);
            rect.setAttribute('height', h * 0.6);
            rect.setAttribute('x', w * 0.2);
            rect.setAttribute('y', centerY - (h * 0.3));
            rect.setAttribute('rx', '4');
            rect.setAttribute('ry', '4');
            rect.setAttribute('fill', getInstructionColor(instruction.type));
            rect.setAttribute('stroke', '#2c3e50');
            rect.setAttribute('stroke-width', '2');
            group.appendChild(rect);
            
            // Right connection line
            const rightLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            rightLine.setAttribute('x1', w * 0.8);
            rightLine.setAttribute('y1', centerY);
            rightLine.setAttribute('x2', w);
            rightLine.setAttribute('y2', centerY);
            rightLine.setAttribute('stroke', '#2c3e50');
            rightLine.setAttribute('stroke-width', '2');
            group.appendChild(rightLine);
            
            // Type text for fallback
            const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            typeText.setAttribute('x', w/2);
            typeText.setAttribute('y', centerY);
            typeText.setAttribute('text-anchor', 'middle');
            typeText.setAttribute('dominant-baseline', 'middle');
            typeText.setAttribute('fill', '#2c3e50');
            typeText.setAttribute('font-weight', 'bold');
            typeText.setAttribute('font-size', '10px');
            typeText.textContent = instruction.type;
            group.appendChild(typeText);
        }
        
        // Add tag label above the symbol for all instruction types except comparisons (they handle their own text)
        if (!['ge', 'gt', 'le', 'lt', 'ne', 'eq'].includes(type)) {
            const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            tagText.setAttribute('x', w/2);
            tagText.setAttribute('y', -5);
            tagText.setAttribute('text-anchor', 'middle');
            tagText.setAttribute('fill', '#2c3e50');
            tagText.setAttribute('font-size', '14px');
            tagText.setAttribute('font-weight', 'bold');
            tagText.setAttribute('font-family', 'Arial, sans-serif');
            tagText.textContent = instruction.tag;
            group.appendChild(tagText);
        }
        
        svg.appendChild(group);
    }

    function getInstructionColor(type) {
        switch(type.toLowerCase()) {
            case 'xic':
                return '#e3f2fd';
            case 'xio':
                return '#fff3e0';
            case 'ote':
                return '#e8f5e9';
            case 'ge':
            case 'gt':
            case 'le':
            case 'lt':
            case 'ne':
            case 'eq':
                return '#fff8e1'; // Light yellow for comparison instructions
            default:
                return '#f8f9fa';
        }
    }

    parseLadderButton.addEventListener('click', () => {
        const input = ladderInput.value.trim();
        if (!input) {
            showLadderError('Please enter ladder logic to parse.');
            rungContainer.innerHTML = ''; // Clear visualization
            return;
        }

        try {
            hideLadderError(); // Hide any previous errors
            console.log('Parsing input:', input); // Debug log
            const parsedRungs = parseLadderLogic(input);
            console.log('Parsed rungs:', parsedRungs); // Debug log
            
            if (parsedRungs.length === 0) {
                showLadderError('No valid ladder logic rungs found.');
                rungContainer.innerHTML = ''; // Clear visualization
                return;
            }
            visualizeLadderLogic(parsedRungs);
        } catch (error) {
            console.error('Detailed parsing error:', error); // Debug log
            showLadderError('Error parsing ladder logic: ' + error.message);
            rungContainer.innerHTML = ''; // Clear visualization
        }
    });
}); 