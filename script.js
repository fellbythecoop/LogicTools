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
                // First, find the last instruction which should be the output
                const lastInstructionMatch = rung.match(/(\w+\([^)]+\))$/);
                if (!lastInstructionMatch) {
                    throw new Error(`Invalid rung format: ${rung}`);
                }
                
                const output = lastInstructionMatch[1];
                // Get everything before the output instruction
                const main = rung.slice(0, rung.length - output.length).trim();
                
                if (!output) {
                    throw new Error(`Missing output instruction in rung: ${rung}`);
                }

                const outputInstruction = parseInstruction(output);
                if (!outputInstruction) {
                    throw new Error(`Invalid output instruction: ${output}`);
                }

                let inputInstructions = [];
                if (main) {
                    // Check for branches at the start
                    if (main.startsWith('[')) {
                        // Find the closing bracket for the branches
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
                        const mainBranchInstructions = branchStrings[0].match(/(\w+\([^)]*\))/g) || [];
                        const mainBranch = mainBranchInstructions.map(instr => parseInstruction(instr));
                        
                        // Additional branches drop down
                        const sideBranches = branchStrings.slice(1).map(branchStr => {
                            const instructions = branchStr.match(/(\w+\([^)]*\))/g) || [];
                            return instructions.map(instr => parseInstruction(instr));
                        });
                        
                        inputInstructions = {
                            mainBranch: mainBranch,
                            sideBranches: sideBranches
                        };
                        
                        // Parse any series instructions after the branches
                        if (afterBranches) {
                            const seriesInstructions = afterBranches.match(/(\w+\([^)]+\))/g) || [];
                            inputInstructions.seriesAfterBranches = seriesInstructions.map(instr => parseInstruction(instr));
                        }
                    } else {
                        // Single branch - parse as series
                        const instructions = main.match(/(\w+\([^)]+\))/g) || [];
                        inputInstructions = instructions.map(instr => parseInstruction(instr));
                    }
                }

                if (!inputInstructions || (Array.isArray(inputInstructions) && inputInstructions.length === 0) || 
                    (typeof inputInstructions === 'object' && !inputInstructions.mainBranch && !inputInstructions.sideBranches)) {
                    throw new Error(`No valid input instructions found in: ${main}`);
                }

                return {
                    inputs: inputInstructions,
                    output: outputInstruction
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
            
            // Calculate dynamic SVG height based on number of side branches
            const BASE_HEIGHT = 180;
            const BRANCH_HEIGHT = 80; // Height added per side branch
            const numSideBranches = (typeof rung.inputs === 'object' && rung.inputs.sideBranches) ? rung.inputs.sideBranches.length : 0;
            const SVG_HEIGHT = BASE_HEIGHT + (numSideBranches * BRANCH_HEIGHT);
            
            // SVG dimensions and constants
            const SVG_WIDTH = 800;
            const INSTRUCTION_WIDTH = 100;
            const INSTRUCTION_HEIGHT = 40;
            const HORIZONTAL_SPACING = 30;
            const VERTICAL_BRANCH_SPACING = 80; // Spacing between side branches
            const POWER_RAIL_OFFSET = 20;
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
            let currentX = rungStartX + HORIZONTAL_SPACING;
            let oteX = rungEndX - INSTRUCTION_WIDTH;
            
            // Draw main rung line (continuous from left rail to right rail)
            svg.appendChild(createSVGLine(rungStartX, MAIN_RUNG_Y, rungEndX, MAIN_RUNG_Y, '#2c3e50', 2));
            
            // Check for branched structure
            if (typeof rung.inputs === 'object' && (rung.inputs.mainBranch || rung.inputs.sideBranches)) {
                const mainBranch = rung.inputs.mainBranch || [];
                const sideBranches = rung.inputs.sideBranches || [];
                const seriesAfterBranches = rung.inputs.seriesAfterBranches || [];
                
                // Calculate the span of the branch section
                let maxBranchLength = mainBranch.length;
                sideBranches.forEach(branch => {
                    maxBranchLength = Math.max(maxBranchLength, branch.length);
                });
                
                const branchStartX = currentX;
                const branchEndX = branchStartX + (maxBranchLength * (INSTRUCTION_WIDTH + HORIZONTAL_SPACING)) - HORIZONTAL_SPACING;
                
                // Draw main branch instructions on the main rung
                let mainBranchX = branchStartX;
                mainBranch.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, mainBranchX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    mainBranchX += INSTRUCTION_WIDTH + HORIZONTAL_SPACING;
                });
                
                // Draw side branches
                if (sideBranches.length > 0) {
                    // Single tee line down from main rung at start
                    const firstBranchY = MAIN_RUNG_Y + VERTICAL_BRANCH_SPACING;
                    const lastBranchY = MAIN_RUNG_Y + (sideBranches.length * VERTICAL_BRANCH_SPACING);
                    svg.appendChild(createSVGLine(branchStartX, MAIN_RUNG_Y, branchStartX, lastBranchY, '#2c3e50', 2));
                    
                    // Single join line up to main rung at end
                    svg.appendChild(createSVGLine(branchEndX, MAIN_RUNG_Y, branchEndX, lastBranchY, '#2c3e50', 2));
                    
                    sideBranches.forEach((branch, branchIndex) => {
                        const branchY = MAIN_RUNG_Y + ((branchIndex + 1) * VERTICAL_BRANCH_SPACING);
                        
                        // Horizontal branch line
                        svg.appendChild(createSVGLine(branchStartX, branchY, branchEndX, branchY, '#2c3e50', 2));
                        
                        // Draw branch instructions
                        let branchInstrX = branchStartX;
                        branch.forEach((instruction, instrIndex) => {
                            createInstructionSVG(svg, instruction, branchInstrX, branchY - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                            branchInstrX += INSTRUCTION_WIDTH + HORIZONTAL_SPACING;
                        });
                    });
                }
                
                // Update current X to after the branch section
                currentX = branchEndX + HORIZONTAL_SPACING;
                
                // Draw series instructions after branches
                seriesAfterBranches.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, currentX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    currentX += INSTRUCTION_WIDTH + HORIZONTAL_SPACING;
                });
                
                // Draw OTE at the end
                if (rung.output) {
                    createInstructionSVG(svg, rung.output, oteX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                }
            } else if (Array.isArray(rung.inputs)) {
                // Series (no branches) - simple series of instructions
                rung.inputs.forEach((instruction, index) => {
                    createInstructionSVG(svg, instruction, currentX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
                    currentX += INSTRUCTION_WIDTH + HORIZONTAL_SPACING;
                });
                
                // Place OTE at the end
                if (rung.output) {
                    createInstructionSVG(svg, rung.output, oteX, MAIN_RUNG_Y - INSTRUCTION_HEIGHT / 2, INSTRUCTION_WIDTH, INSTRUCTION_HEIGHT);
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
        // Box
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', w);
        rect.setAttribute('height', h);
        rect.setAttribute('rx', '4');
        rect.setAttribute('ry', '4');
        rect.setAttribute('fill', getInstructionColor(instruction.type));
        rect.setAttribute('stroke', '#2c3e50');
        rect.setAttribute('stroke-width', '2');
        group.appendChild(rect);
        // Type
        const typeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        typeText.setAttribute('x', w/2);
        typeText.setAttribute('y', h/2 - 5);
        typeText.setAttribute('text-anchor', 'middle');
        typeText.setAttribute('fill', '#2c3e50');
        typeText.setAttribute('font-weight', 'bold');
        typeText.textContent = instruction.type;
        group.appendChild(typeText);
        // Tag
        const tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tagText.setAttribute('x', w/2);
        tagText.setAttribute('y', h/2 + 15);
        tagText.setAttribute('text-anchor', 'middle');
        tagText.setAttribute('fill', '#666');
        tagText.setAttribute('font-size', '0.9em');
        tagText.textContent = instruction.tag;
        group.appendChild(tagText);
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
            default:
                return '#f8f9fa';
        }
    }

    parseLadderButton.addEventListener('click', () => {
        const input = ladderInput.value.trim();
        if (!input) {
            showError('Please enter ladder logic to parse.');
            return;
        }

        try {
            console.log('Parsing input:', input); // Debug log
            const parsedRungs = parseLadderLogic(input);
            console.log('Parsed rungs:', parsedRungs); // Debug log
            
            if (parsedRungs.length === 0) {
                showError('No valid ladder logic rungs found.');
                return;
            }
            visualizeLadderLogic(parsedRungs);
        } catch (error) {
            console.error('Detailed parsing error:', error); // Debug log
            showError('Error parsing ladder logic: ' + error.message);
        }
    });
}); 