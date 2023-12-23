import { query, update, Canister, text, Record, StableBTreeMap, Ok, Err, Vec, Result, nat64, ic, Variant } from 'azle';
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a crowdfunding project.
 */

const Contributor = Record({
    contributor: text,
    amount: nat64,
});

const ProjectPayload = Record({
    title: text,
    description: text,
    goalAmount: nat64,
    duration: nat64,
    creator: text,
});

type ProjectPayload = typeof ProjectPayload.tsType;

const Project = Record({
    id: text,
    creator: text,
    title: text,
    description: text,
    goalAmount: nat64,
    raisedAmount: nat64,
    deadline: nat64,
    contributors: Vec(text),
    status: text
});

type Project = typeof Project.tsType;

const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
    InsufficientFunds: text,
    ProjectNotOpen: text,
    ProjectExpired: text,
});

type Error = typeof Error.tsType;

enum ProjectStatus {
    Funding = "Funding",
    Successful = "Successful",
    Expired = "Expired",
}

const crowdfundingProjects = StableBTreeMap<text, Project>(0);

export default Canister({
    createProject: update([ProjectPayload], Result(Project, Error), (payload) => {
        if(!payload.duration || !payload.title || !payload.description || !payload.creator || !payload.goalAmount){
            return Err({ InvalidPayload: `The payload has missing attributes`})
        }
        
        const project = {
            id: uuidv4(),
            raisedAmount: 0n,
            deadline: ic.time() + payload.duration,
            contributors: [],
            status: ProjectStatus.Funding,
            ...payload
        };

        crowdfundingProjects.insert(project.id, project);
        return Ok(project);
    }),

    contributeToProject: update([text, Contributor], Result(Project, Error), (projectId, payload) => {
        const projectOpt = crowdfundingProjects.get(projectId);
        if ("None" in projectOpt) {
            return Err({ NotFound: `Project with id=${projectId} not found` });
        }

        const project = projectOpt.Some;

        if (project.status == ProjectStatus.Expired) {
            return Err({ ProjectExpired: `Project with id=${projectId} has expired` });
        }

        if (ic.time() >= project.deadline) {
            project.status = ProjectStatus.Expired;
            crowdfundingProjects.insert(project.id, project);
            return Err({ ProjectExpired: `Project with id=${projectId} has expired` });
        }

        project.raisedAmount = project.raisedAmount + payload.amount;
        project.contributors.push(payload.contributor);
        crowdfundingProjects.insert(project.id, project);

        return Ok(project);
    }),

    getProjects: query([], Result(Vec(Project), Error), () => {
        return Ok(crowdfundingProjects.values());
    }),

    getProject: query([text], Result(Project, Error), (projectId) => {
        const projectOpt = crowdfundingProjects.get(projectId);
        if ("None" in projectOpt) {
            return Err({ NotFound: `Project with id=${projectId} not found` });
        }

        const project = projectOpt.Some;
        return Ok(project);
    }),

    getContributors: query([text], Result(Vec(text), Error), (projectId) => {
        const projectOpt = crowdfundingProjects.get(projectId);
        if ("None" in projectOpt) {
            return Err({ NotFound: `Project with id=${projectId} not found` });
        }

        const project = projectOpt.Some;
        return Ok(project.contributors);
    }),

    getExpiredProjects: query([], Result(Vec(Project), Error), () => {
        const expiredProjects = crowdfundingProjects.values().filter(project => 
            project.status == ProjectStatus.Expired
        );
        return Ok(expiredProjects);
    }),
});

globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};