import { Injectable } from '@nestjs/common'
import {
  IJobSections,
  IWorkerCultureProfile,
  IWorkerSkillProfile,
} from '../interfaces/embedding.interface'

@Injectable()
export class EmbeddingTextBuilder {
  //Profile
  buildSkillText(profile: IWorkerSkillProfile): string {
    const parts: string[] = [profile.occupation.name]

    if (profile.experienceYear != null) {
      parts.push(`${profile.experienceYear} năm kinh nghiệm`)
    }

    if (profile.bio?.trim()) {
      parts.push(profile.bio)
    }
    return parts.join(' | ')
  }

  buildCultureText(profile: IWorkerCultureProfile): string {
    return profile.desiredJobText?.trim() ?? ''
  }

  //Job   occupation là con sector là cha
  buildJobReqText(sections: IJobSections, occupationName: string): string {
    const parts: string[] = [occupationName]

    if (sections.requirements.trim()) {
      parts.push(sections.requirements)
    }

    return parts.join(' | ')
  }

  buildJobBenefitText(sections: IJobSections): string {
    return sections.benefits.trim()
  }
}
