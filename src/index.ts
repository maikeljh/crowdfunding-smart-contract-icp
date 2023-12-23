import { query, update, Canister, text, Record, StableBTreeMap, Ok, Err, Vec, Result, nat64, ic, Variant, Principal } from 'azle';

/**
 * This type represents a contributor for a crowdfunding project.
 */
const Contributor = Record({
    contributor: text,
    amount: nat64,
});

type Contributor = typeof Contributor.tsType;

/**
 * This type represents a crowdfunding project payload.
 */
const ProjectPayload = Record({
    title: text,
    description: text,
    goalAmount: nat64,
    duration: nat64,
    creator: text,
});

type ProjectPayload = typeof ProjectPayload.tsType;

/**
 * This type represents a crowdfunding project.
 */
const Project = Record({
    id: Principal,
    creator: text,
    title: text,
    description: text,
    goalAmount: nat64,
    raisedAmount: nat64,
    deadline: nat64,
    startTime: nat64,
    contributors: Vec(text),
    status: text
});

type Project = typeof Project.tsType;

/**
 * This type represents Error variant.
 */
const Error = Variant({
    NotFound: text,         // Indicates that a resource was not found.
    InvalidPayload: text,   // Indicates that the payload is missing required attributes.
    InvalidStatus: text,    // Indicates that an invalid status was provided.
    ProjectExpired: text,   // Indicates that the project has expired.
    Fail: text,             // Indicates a general failure.
});

type Error = typeof Error.tsType;

/**
 * Enumeration for project status.
 */
enum ProjectStatus {
    Funding = "Funding",
    Successful = "Successful",
    Expired = "Expired",
}

// Initialize a stable B-tree map to store crowdfunding projects.
const crowdfundingProjects = StableBTreeMap<Principal, Project>(0);

export default Canister({
    /* Create Operations */
    // Creates a new crowdfunding project
    createProject: update([ProjectPayload], Result(Project, Error), (payload) => {
        try {
            // Validate payload attributes
            if (!payload || !payload.duration || !payload.title || !payload.description || !payload.creator || !payload.goalAmount) {
                return Err({ InvalidPayload: `The payload has missing attributes` })
            }

            // Create unique id
            let id = generateId();
            while (!("None" in crowdfundingProjects.get(id))) {
                id = generateId();
            }

            // Create new project
            const project = {
                id: id,
                raisedAmount: 0n,
                startTime: ic.time(),
                deadline: ic.time() + payload.duration,
                contributors: [],
                status: ProjectStatus.Funding,
                ...payload
            };

            // Insert the project into the map
            crowdfundingProjects.insert(project.id, project);
            return Ok(project);
        } catch (error: any) {
            return Err({ Fail: `Failed to add project: ${error}` })
        }
    }),

    // Allows a contributor to contribute to an existing crowdfunding project
    contributeToProject: update([Principal, Contributor], Result(Project, Error), (projectId, payload) => {
        try {
            // Validate input parameters
            if (!projectId || !payload || !payload.contributor || !payload.amount) {
                return Err({ InvalidPayload: `The payload has missing attributes` })
            }

            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);

            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;

            // Check if the project is expired or successful
            if (project.status == ProjectStatus.Expired || project.status == ProjectStatus.Successful) {
                return Err({ ProjectExpired: `Project with id=${projectId} has expired` });
            }

            // Check if the current time has exceeded the project deadline
            if (ic.time() >= project.deadline) {
                project.status = ProjectStatus.Expired;
                crowdfundingProjects.insert(project.id, project);
                return Err({ ProjectExpired: `Project with id=${projectId} has expired` });
            }

            // Update project details with the contribution
            project.raisedAmount = project.raisedAmount + payload.amount;
            project.contributors.push(payload.contributor);
            crowdfundingProjects.insert(project.id, project);

            return Ok(project);
        } catch (error: any) {
            return Err({ Fail: `Failed to contribute to project: ${error}` })
        }
    }),

    /* Read Operations */
    // Retrieves a list of crowdfunding projects based on their status if provided
    getProjects: query([text], Result(Vec(Project), Error), (status) => {
        try {
            if (status) {
                // Filter projects by status if provided
                const projects = crowdfundingProjects.values().filter(project =>
                    project.status == status
                );
                return Ok(projects);
            } else {
                // Return all projects if no status is provided
                return Ok(crowdfundingProjects.values());
            }
        } catch (error: any) {
            return Err({ Fail: `Failed to get projects: ${error}` })
        }
    }),

    // Retrieves the details of a specific crowdfunding project based on its ID
    getProject: query([Principal], Result(Project, Error), (projectId) => {
        try {
            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);
            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;
            return Ok(project);
        } catch (error: any) {
            return Err({ Fail: `Failed to get project: ${error}` })
        }
    }),

    // Retrieves the list of contributors for a specific crowdfunding project
    getContributors: query([Principal], Result(Vec(text), Error), (projectId) => {
        try {
            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);
            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;
            return Ok(project.contributors);
        } catch (error: any) {
            return Err({ Fail: `Failed to get contributor: ${error}` })
        }
    }),

    /* Update Operations */
    // Updates the status of a crowdfunding project based on the provided status
    updateStatus: update([Principal, text], Result(Project, Error), (projectId, status) => {
        try {
            // Validate input parameters
            if (!projectId || !status) {
                return Err({ InvalidPayload: `The payload has missing attributes` })
            }

            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);
            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;

            // Check if the provided status is a valid project status
            if (status in ProjectStatus) {
                // Update project status
                project.status = status;
                crowdfundingProjects.insert(project.id, project);
                return Ok(project);
            } else {
                return Err({ InvalidStatus: `Invalid status given` })
            }
        } catch (error: any) {
            return Err({ Fail: `Failed to update status project: ${error}` })
        }
    }),

    // Updates the details of an existing crowdfunding project
    updateProject: update([Principal, ProjectPayload], Result(Project, Error), (projectId, payload) => {
        try {
            // Validate payload attributes
            if (!payload || !payload.duration || !payload.title || !payload.description || !payload.creator || !payload.goalAmount) {
                return Err({ InvalidPayload: `The payload has missing attributes` })
            }

            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);
            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;

            // Check if the updated project duration is valid
            if (project.startTime + payload.duration < ic.time()) {
                return Err({ InvalidPayload: `Invalid duration` })
            }

            // Update project details with the new payload, ensuring valid attributes
            const updatedProject = {
                id: project.id,
                raisedAmount: project.raisedAmount,
                startTime: project.startTime,
                contributors: project.contributors,
                status: project.status,
                deadline: project.startTime + payload.duration,
                ...payload
            };

            // Update the project in the map
            crowdfundingProjects.insert(updatedProject.id, updatedProject);
            return Ok(updatedProject);
        } catch (error: any) {
            return Err({ Fail: `Failed to add project: ${error}` })
        }
    }),

    /* Delete Operations */
    // Cancels a crowdfunding project, setting its status to "Expired"
    cancelProject: update([Principal], Result(Project, Error), (projectId) => {
        try {
            // Validate input parameter
            if (!projectId) {
                return Err({ InvalidPayload: `The payload has missing attributes` })
            }

            // Retrieve the project from the map
            const projectOpt = crowdfundingProjects.get(projectId);
            if ("None" in projectOpt) {
                return Err({ NotFound: `Project with id=${projectId} not found` });
            }

            // Extract the project from the option
            const project = projectOpt.Some;

            // Set project status to Expired to indicate cancellation
            project.status = ProjectStatus.Expired;
            crowdfundingProjects.insert(project.id, project);

            return Ok(project);
        } catch (error: any) {
            return Err({ Fail: `Failed to update status project: ${error}` })
        }
    }),
});

// Function to create a unique id
const generateId = (): Principal => {
    const randomBytes = new Array(29)
        .fill(0)
        .map((_) => Math.floor(Math.random() * 256));

    return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
